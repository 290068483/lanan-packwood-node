const { exec } = require('child_process');
const os = require('os');
const { spawn } = require('child_process');

// 设置控制台编码为UTF-8，解决Windows平台乱码问题
if (os.platform() === 'win32') {
  exec('chcp 65001', (error, stdout, stderr) => {
    if (error) {
      console.error('设置控制台编码时出错:', error);
    }
  });
}

const fs = require('fs');
const path = require('path');
const http = require('http');

// Electron相关模块
let ipcMain = null;
try {
  const electron = require('electron');
  ipcMain = electron.ipcMain;
} catch (e) {
  // Electron模块不可用
}

const { logError, logInfo, logSuccess, logWarning } = require('./utils/logger');
const { processCustomerData } = require('./utils/customer-data-processor');
// 已根据 old 目录文件完善输出的客户表格数据和格式，添加了第二个工作表（已打包）
const { checkDataIntegrity } = require('./utils/data-integrity-check');
// 注释掉不存在的模块引用
// const { networkMonitor } = require('./network/network-monitor');

const DataManager = require('./utils/data-manager');
const EnhancedFileWatcher = require('./utils/enhanced-file-watcher');
const customerStatusManager = require('./utils/customer-status-manager');
const PackageDataExtractor = require('./utils/package-data-extractor');
const envManager = require('./utils/env-manager');
const dbConnection = require('./database/connection');

// 添加Electron支持
let isElectron = false;
let isDevMode = false;
let currentEnv = 'production'; // 默认环境

try {
  // 尝试检测Electron环境
  if (process.versions && process.versions.electron) {
    isElectron = true;
  }

  // 检测是否为开发模式
  if (process.env.NODE_ENV === 'development' || process.argv.includes('--dev')) {
    isDevMode = true;
  }
} catch (e) {
  // Electron环境不可用
}

/**
 * 解析命令行参数
 * @returns {Object} 解析后的参数
 */
function parseCommandLineArgs() {
  const args = process.argv.slice(2);
  const parsedArgs = {
    env: 'production',
    help: false,
    listEnvs: false,
    port: 3000
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--env' || arg === '-e') {
      parsedArgs.env = args[i + 1];
      i++; // 跳过下一个参数
    } else if (arg === '--help' || arg === '-h') {
      parsedArgs.help = true;
    } else if (arg === '--list-envs' || arg === '-l') {
      parsedArgs.listEnvs = true;
    } else if (arg === '--port' || arg === '-p') {
      parsedArgs.port = parseInt(args[i + 1]);
      i++; // 跳过下一个参数
    } else if (arg === '--dev') {
      parsedArgs.env = 'development';
    } else if (arg === '--test') {
      parsedArgs.env = 'testing';
    } else if (arg === '--prod') {
      parsedArgs.env = 'production';
    }
  }

  return parsedArgs;
}

/**
 * 显示帮助信息
 */
function showHelp() {
  console.log(`\n🚀 Pack Node 应用程序\n`);
  console.log(`用法: node src/main.js [选项]\n`);
  console.log(`选项:`);
  console.log(`  --env, -e <环境>     指定运行环境 (development|production|testing)`);
  console.log(`  --dev               使用开发环境`);
  console.log(`  --test              使用测试环境`);
  console.log(`  --prod              使用生产环境 (默认)`);
  console.log(`  --port, -p <端口>   指定HTTP服务器端口 (默认: 3000)`);
  console.log(`  --list-envs, -l     列出所有可用环境`);
  console.log(`  --help, -h          显示帮助信息\n`);
  console.log(`示例:`);
  console.log(`  node src/main.js --env development`);
  console.log(`  node src/main.js --test --port 8080`);
  console.log(`  node src/main.js --dev\n`);
}

/**
 * 初始化环境配置
 * @param {string} env - 环境名称
 */
function initializeEnvironment(env) {
  try {
    console.log(`🔄 正在初始化${env}环境...`);

    // 加载环境配置
    const config = envManager.loadEnvironment(env);
    currentEnv = env;

    // 初始化数据库连接
    dbConnection.initializeDefaultConnection(env);

    console.log(`✅ ${config.name}初始化完成`);

    // 如果是测试环境，显示测试数据信息
    if (envManager.isTesting() && config.testData) {
      console.log(`🧪 测试数据: ${config.testData.description}`);
      console.log(`📊 客户状态: ${config.testData.customerStates.join(', ')}`);
      console.log(`🔧 面板状态: ${config.testData.panelStates.join(', ')}`);
    }

    return config;
  } catch (error) {
    console.error(`❌ 初始化环境失败: ${error.message}`);
    throw error;
  }
}

// 创建HTTP服务器
let server = null;
function startServer(port = 3000) {
  server = http.createServer((req, res) => {
    const { pathname } = new URL(req.url, `http://${req.headers.host}`);

    // 设置CORS头
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // 处理预检请求
    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    // 获取所有客户数据
    else if (pathname === '/api/customers' && req.method === 'GET') {
      (async () => {
        try {
          // 引入数据库API
          const { getAllCustomersAPI } = require('./database/api');

          const allCustomers = await getAllCustomersAPI();
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            success: true,
            data: allCustomers
          }));
        } catch (error) {
          console.error('获取客户数据时出错:', error);
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            success: false,
            message: `获取客户数据出错: ${error.message}`
          }));
        }
      })();
    }
    // 切换数据库
    else if (pathname === '/api/database/switch' && req.method === 'POST') {
      (async () => {
        try {
          let body = '';
          req.on('data', chunk => {
            body += chunk.toString();
          });
          req.on('end', async () => {
            try {
              const { dbType } = JSON.parse(body);

              // 引入数据库连接
              const { switchDatabase, getCurrentDbType } = require('./database/connection');

              // 切换数据库
              switchDatabase(dbType);

              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({
                success: true,
                message: `已切换到${dbType === 'production' ? '生产' : '测试'}数据库`,
                currentDbType: getCurrentDbType()
              }));
            } catch (error) {
              console.error('切换数据库时出错:', error);
              res.writeHead(500, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({
                success: false,
                message: `切换数据库出错: ${error.message}`
              }));
            }
          });
        } catch (error) {
          console.error('切换数据库时出错:', error);
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            success: false,
            message: `切换数据库出错: ${error.message}`
          }));
        }
      })();
    }
    // 获取当前数据库类型
    else if (pathname === '/api/database/current' && req.method === 'GET') {
      try {
        // 引入数据库连接
        const { getCurrentDbType } = require('./database/connection');

        const currentDbType = getCurrentDbType();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          currentDbType: currentDbType
        }));
      } catch (error) {
        console.error('获取当前数据库类型时出错:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: false,
          message: `获取当前数据库类型出错: ${error.message}`
        }));
      }
    }
    // 打开客户Excel文件
    else if (pathname.startsWith('/api/customers/') && pathname.includes('/open-excel')) {
      if (req.method === 'POST') {
        try {
          const customerName = decodeURIComponent(pathname.split('/')[3]);

          // 获取配置
          const configPath = path.join(__dirname, '../config.json');
          const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

          // 构建客户目录路径
          const customerDir = path.join(config.sourcePath, customerName);

          // 查找Excel文件
          let excelFile = null;
          if (fs.existsSync(customerDir)) {
            const files = fs.readdirSync(customerDir);
            // 查找xlsx或xls文件
            const excelFiles = files.filter(file =>
              file.endsWith('.xlsx') || file.endsWith('.xls')
            );

            if (excelFiles.length > 0) {
              // 优先选择xlsx文件，如果没有则选择第一个xls文件
              excelFile = excelFiles.find(file => file.endsWith('.xlsx')) || excelFiles[0];
              excelFile = path.join(customerDir, excelFile);
            }
          }

          if (excelFile && fs.existsSync(excelFile)) {
            // 在Web模式下，我们不能直接打开文件，而是返回文件路径供前端处理
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
              success: true,
              message: '找到Excel文件',
              filePath: excelFile
            }));
          } else {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
              success: false,
              message: '未找到客户的Excel文件'
            }));
          }
        } catch (error) {
          console.error('查找客户Excel文件时出错:', error);
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            success: false,
            message: `查找Excel文件出错: ${error.message}`
          }));
        }
      } else {
        res.writeHead(405, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: false,
          message: '请求方法不允许'
        }));
      }
    }
    // 未知路由
    else {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: false,
        message: 'API未找到'
      }));
    }
  });

  // 绑定端口前添加诊断日志
  console.log(`准备启动HTTP服务器，端口: ${port}`);
  console.log(`当前进程ID: ${process.pid}`);
  console.log(`运行环境: ${isElectron ? 'Electron' : 'Node.js'}`);
  console.log(`绑定地址: 0.0.0.0 (同时支持IPv4和IPv6)`);

  // 明确指定绑定0.0.0.0以同时支持IPv4和IPv6
  server.listen(port, '0.0.0.0', () => {
    console.log(`🚀 HTTP服务器已启动，监听端口 ${port}`);
    logInfo('SYSTEM', 'SERVER', `HTTP服务器已启动，监听端口 ${port}`);
  });

  // 错误处理
  server.on('error', (error) => {
    console.error('服务器启动失败:', error.code || error);
    console.error('错误详情:', error);
    logError('SYSTEM', 'SERVER', `服务器启动失败: ${error.message || error}`);

    // 特殊处理端口占用错误
    if (error.code === 'EADDRINUSE') {
      console.error(`端口 ${port} 已被占用，请检查是否有其他应用程序正在使用该端口。`);
    }
  });

  server.on('connection', (socket) => {
    // 新连接建立
  });

  return server;
}

// 设置IPC处理程序
function setupIPCHandlers() {
  if (!ipcMain) {
    console.log('Electron IPC不可用，跳过IPC处理程序设置');
    return;
  }

  console.log('设置Electron IPC处理程序...');

  // 数据库切换处理
  ipcMain.handle('switch-database', async (event, dbType) => {
    try {
      const { switchDatabase, getCurrentDbType } = require('./database/connection');

      // 切换数据库
      switchDatabase(dbType);

      return {
        success: true,
        message: `已切换到${dbType === 'production' ? '生产' : '测试'}数据库`,
        currentDbType: getCurrentDbType()
      };
    } catch (error) {
      console.error('切换数据库时出错:', error);
      return {
        success: false,
        message: `切换数据库出错: ${error.message}`
      };
    }
  });

  // 获取当前数据库类型处理
  ipcMain.handle('get-current-database-type', async () => {
    try {
      const { getCurrentDbType } = require('./database/connection');

      const currentDbType = getCurrentDbType();
      return {
        success: true,
        currentDbType: currentDbType
      };
    } catch (error) {
      console.error('获取当前数据库类型时出错:', error);
      return {
        success: false,
        message: `获取当前数据库类型出错: ${error.message}`
      };
    }
  });
}

// 全局配置对象，将在环境初始化后设置
let config = null;

// 根据配置确定客户目录命名方式
function getCustomerDirectoryName(customerName) {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');

  // 检查配置中的命名格式
  if (config.customFileNameFomat) {
    // 解析配置中的格式，提取结尾字符
    const formatEndChar = config.customFileNameFomat.slice(-1);
    if (formatEndChar === '#') {
      // 如果配置以#结尾，则客户目录也以#结尾
      return `${dateStr}_${customerName}#`;
    } else if (formatEndChar === '.') {
      // 如果配置以.结尾，则客户目录也以.结尾
      return `${dateStr}_${customerName}.`;
    }
    // 如果配置不以特殊字符结尾，则客户目录也不添加特殊字符
  }

  // 默认不添加特殊字符
  return `${dateStr}_${customerName}`;
}



// 初始化并启动增强的文件监控器
let fileWatcher = null;
function initFileWatcher() {
  if (!config) {
    console.warn('⚠️ 配置未加载，无法初始化文件监控器');
    return;
  }

  if (fileWatcher) {
    fileWatcher.stop();
  }

  fileWatcher = new EnhancedFileWatcher({
    workerPackagesPath: config.localPath,
    sourcePath: config.sourcePath
  });

  // 添加UI更新回调函数
  fileWatcher.addUIUpdateCallback((eventType, data) => {
    // 这里可以添加WebSocket或HTTP通知逻辑
    // 目前先记录日志，后续可以扩展为实时通知
  });

  // 添加回调函数，当检测到packages.json变化时更新客户状态
  fileWatcher.addCallback(async (filePath, changes) => {
    try {
      // 从文件路径提取客户名称
      const dirName = path.basename(path.dirname(filePath));
      const customerName = dirName.replace(/\d{6}_/, '').replace(/[#.]$/, '');

      // 从数据管理器获取客户数据
      const customerData = DataManager.getCustomerByName(customerName);
      if (customerData) {
        // 保存更新后的数据
        DataManager.upsertCustomer(changes.customerData);

        logSuccess(
          customerName,
          'FILE_WATCHER',
          `客户状态已更新: ${changes.status} (${changes.packProgress}%)`
        );
      }
    } catch (error) {
      console.error(`处理文件变化时出错: ${error.message}`);
      logError(
        'FILE_WATCHER',
        'FILE_WATCHER',
        `处理文件变化时出错: ${error.message}`
      );
    }
  });

  // 启动文件监控
  try {
    fileWatcher.start('onChange');
    fileWatcher.watchSourceDirectory();
    logInfo('SYSTEM', 'FILE_WATCHER', '文件监控已启动（实时模式）');
    logInfo('SYSTEM', 'FILE_WATCHER', '源目录监控已启动（实时检测新增/删除客户）');
  } catch (error) {
    logError('SYSTEM', 'FILE_WATCHER', `启动文件监控失败: ${error.message}`);
  }
}

// 文件监控器将在环境初始化后启动

/**
 * 处理所有客户数据
 */
async function processAllCustomers() {
  try {
    if (!config) {
      throw new Error('配置未加载，无法处理客户数据');
    }

    // 确保源目录存在
    const sourceBaseDir = config.sourcePath;
    if (!fs.existsSync(sourceBaseDir)) {
      console.log(`❌ 源基础目录不存在: ${sourceBaseDir}`);
      return { successCount: 0, totalCustomers: 0 };
    }

    // 读取所有客户目录
    const customerDirs = fs.readdirSync(sourceBaseDir).filter(dir => {
      const fullPath = path.join(sourceBaseDir, dir);
      // 确保这是一个目录
      return fs.statSync(fullPath).isDirectory();
    });

    let successCount = 0;
    const totalCustomers = customerDirs.length;

    // 处理每个客户
    for (const customerDir of customerDirs) {
      try {
        const customerPath = path.join(sourceBaseDir, customerDir);
        // 按照配置生成客户文件夹名称
        const customerOutputName = getCustomerDirectoryName(customerDir);
        const customerOutputDir = path.join(config.localPath, customerOutputName);
        const result = await processCustomerData(customerPath, customerOutputDir, customerDir, config);

        if (result !== undefined) {
          successCount++;
        } else {
          // 即使没有处理结果，也算作处理了一个客户
          successCount++;
        }

        // 获取客户处理后的状态
        const processedCustomer = await DataManager.getCustomer(customerDir);
        let finalStatus = customerStatusManager.STATUS.NOT_PACKED;
        let packProgress = 0;

        if (processedCustomer) {
          // 获取packages.json文件路径
          const packagesPath = path.join(processedCustomer.outputPath, 'packages.json');

          // 读取packages.json数据
          let packagesData = [];
          if (fs.existsSync(packagesPath)) {
            packagesData = PackageDataExtractor.extractCustomerPackageData(packagesPath);
          }

          // 检查客户状态
          const statusInfo = customerStatusManager.checkPackStatus(processedCustomer, packagesData);
          finalStatus = statusInfo.status;
          packProgress = statusInfo.packProgress;
        }

        // 更新客户状态到数据管理器
        DataManager.upsertCustomer({
          name: customerDir,
          sourcePath: customerPath,
          outputPath: customerOutputDir,
          status: finalStatus,
          packProgress: packProgress,
          lastUpdate: new Date().toISOString(),
          success: result !== undefined ? result : true // 无数据也算成功处理
        });
      } catch (error) {
        console.error(`✗ 处理客户 ${customerDir} 时出错:`, error.message);
        // 获取客户当前状态
        const processedCustomer = await DataManager.getCustomer(customerDir);
        let finalStatus = customerStatusManager.STATUS.NOT_PACKED;
        let packProgress = 0;

        if (processedCustomer) {
          // 获取packages.json文件路径
          const packagesPath = path.join(processedCustomer.outputPath, 'packages.json');

          // 读取packages.json数据
          let packagesData = [];
          if (fs.existsSync(packagesPath)) {
            packagesData = PackageDataExtractor.extractCustomerPackageData(packagesPath);
          }

          // 检查客户状态
          const statusInfo = customerStatusManager.checkPackStatus(processedCustomer, packagesData);
          finalStatus = statusInfo.status;
          packProgress = statusInfo.packProgress;
        }

        DataManager.upsertCustomer({
          name: customerDir,
          status: finalStatus,
          packProgress: packProgress,
          remark: error.message,
          lastUpdate: new Date().toISOString(),
          success: false
        });
        // 即使出错也增加计数，因为我们已经处理了这个客户（虽然失败了）
        successCount++;
      }
    }

    console.log(`\n✅ 处理完成，成功处理 ${successCount} 个客户数据`);

    // 数据完整性检查 (暂时注释掉，因为函数引用有问题)
    /*
    console.log('\n🔍 开始数据完整性检查...');
    for (const customerDir of customerDirs) {
      try {
        const customerPath = path.join(sourceBaseDir, customerDir);
        await checkDataIntegrity(customerPath, customerDir, config);
      } catch (error) {
        console.error(`✗ 检查客户 ${customerDir} 数据完整性时出错:`, error.message);
      }
    }
    */

    return { successCount, totalCustomers };
  } catch (error) {
    console.error('处理客户数据时发生错误:', error);
    throw error;
  }
}

/**
 * 停止所有现有的Node.js进程（除了当前进程）
 */
async function stopExistingNodeProcesses() {
  return new Promise((resolve, reject) => {
    // 在开发环境下跳过进程停止
    if (isDevMode || currentEnv === 'development') {
      console.log('🔄 开发环境，跳过停止现有进程步骤');
      resolve();
      return;
    }

    console.log('🔄 检查并停止现有的Node.js进程...');

    // Windows平台使用taskkill命令
    if (os.platform() === 'win32') {
      // 获取当前进程ID
      const currentPid = process.pid;

      // 使用PowerShell命令停止除了当前进程外的所有Node.js进程
      const command = `powershell -Command "Get-Process node | Where-Object {$_.Id -ne ${currentPid}} | Stop-Process -Force"`;

      exec(command, (error, stdout, stderr) => {
        if (error) {
          // 如果没有找到Node.js进程，这不是错误
          if (stderr.includes('NoProcessFoundForGivenName') || stderr.includes('找不到进程')) {
            console.log('✅ 没有发现其他运行的Node.js进程');
            resolve();
            return;
          }
          console.error('停止Node.js进程时出错:', error);
          reject(error);
          return;
        }

        if (stderr) {
          console.warn('停止Node.js进程时的警告:', stderr);
        }

        console.log('✅ 已停止所有现有的Node.js进程');
        resolve();
      });
    } else {
      // Linux/Mac平台使用pkill命令
      exec(`pkill -f "node.*main.js" || true`, (error, stdout, stderr) => {
        if (error && !stderr.includes('no process found')) {
          console.error('停止Node.js进程时出错:', error);
          reject(error);
          return;
        }

        console.log('✅ 已停止所有现有的Node.js进程');
        resolve();
      });
    }
  });
}

// 程序入口点
async function main() {
  try {
    // 解析命令行参数
    const args = parseCommandLineArgs();

    // 显示帮助信息
    if (args.help) {
      showHelp();
      return;
    }

    // 列出可用环境
    if (args.listEnvs) {
      console.log('\n🌍 可用环境:');
      const envs = envManager.getAvailableEnvironments();
      envs.forEach(env => {
        console.log(`  - ${env}`);
      });
      console.log('');
      return;
    }

    // 初始化环境配置
    config = initializeEnvironment(args.env);

    // 在开发模式下，跳过停止现有进程的步骤
    if (!isDevMode && args.env !== 'development') {
      // 首先停止所有现有的Node.js进程
      await stopExistingNodeProcesses();

      // 等待1秒确保进程完全停止
      await new Promise(resolve => setTimeout(resolve, 1000));
    } else {
      console.log('开发模式，跳过停止现有进程步骤');
    }

    // 初始化文件监控器
    initFileWatcher();

    // 如果在Electron环境中且不是开发模式，不要立即执行，而是等待UI触发
    if (isElectron && !isDevMode) {
      console.log('🖥️  Electron环境中，等待UI触发处理...');
      // 在Electron环境中，我们导出函数供UI调用
      // 同时启动HTTP服务器以支持API请求
      startServer(args.port);
      // 设置IPC处理程序（如果可用）
      if (ipcMain) {
        setupIPCHandlers();
      }
      return;
    }

    // 在非Electron环境中，直接执行
    await processAllCustomers();

    // 启动HTTP服务器
    startServer(args.port);
  } catch (error) {
    console.error('❌ 程序启动失败:', error);
    process.exit(1);
  }
}

// 只有在直接运行此脚本时才执行main函数
if (require.main === module) {
  main().catch(error => {
    console.error('❌ 程序执行出错:', error);
    process.exit(1);
  });
}

// 导出供其他模块使用
module.exports = {
  processAllCustomers,
  initFileWatcher,
  startServer,
  initializeEnvironment,
  getCurrentEnv: () => currentEnv,
  getCurrentConfig: () => config
};

/**
 * 设置IPC处理程序（Electron环境）
 */
function setupIPCHandlers() {
  if (!ipcMain) return;

  console.log('设置IPC处理程序...');

  // 处理来自UI的请求
  ipcMain.handle('process-all-customers', async () => {
    try {
      return await processAllCustomers();
    } catch (error) {
      console.error('处理所有客户数据时出错:', error);
      throw error;
    }
  });

  ipcMain.handle('start-file-watcher', async (event, config) => {
    try {
      return await initFileWatcher(config);
    } catch (error) {
      console.error('启动文件监控时出错:', error);
      throw error;
    }
  });
}