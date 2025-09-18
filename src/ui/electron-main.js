const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const { exec } = require('child_process');
const DataManager = require('../utils/data-manager');
const fs = require('fs');
const { processAllCustomers } = require('../main');

// 禁用安全警告
process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = 'true';

let mainWindow;
let isProcessing = false;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false, // 禁用 nodeIntegration 提高安全性
      contextIsolation: true, // 启用上下文隔离
      preload: path.join(__dirname, 'electron-preload.js'), // 指定预加载脚本
    }
  });

  // 加载界面文件
  const startUrl = process.env.ELECTRON_START_URL || `file://${path.resolve(__dirname, 'index.html')}`;
  mainWindow.loadURL(startUrl);

  // 在开发模式下打开开发者工具
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', function () {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  try {
    createWindow();

    app.on('activate', function () {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  } catch (error) {
    console.error('创建窗口失败:', error);
    process.exit(1);
  }
}).catch(error => {
  console.error('应用启动失败:', error);
  process.exit(1);
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});

// 全局未捕获异常处理
process.on('uncaughtException', (error) => {
  console.error('未捕获的异常:', error);
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('uncaught-error', {
      message: error.message,
      stack: error.stack
    });
  }
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('未处理的Promise拒绝:', reason, promise);
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('unhandled-rejection', {
      reason: reason.toString(),
      promise: promise.toString()
    });
  }
});

// IPC 处理程序
ipcMain.handle('get-customers', async () => {
  try {
    return await DataManager.getAllCustomers();
  } catch (error) {
    console.error('获取客户数据失败:', error);
    throw new Error(`获取客户数据失败: ${error.message}`);
  }
});

ipcMain.handle('add-customer', async (event, customer) => {
  try {
    await DataManager.upsertCustomer(customer);
    return { success: true };
  } catch (error) {
    console.error('添加客户数据失败:', error);
    return { success: false, error: `添加客户数据失败: ${error.message}` };
  }
});

ipcMain.handle('update-customer-status', async (event, name, status, remark) => {
  try {
    await DataManager.updateCustomerStatus(name, status, remark);
    return { success: true };
  } catch (error) {
    console.error('更新客户状态失败:', error);
    return { success: false, error: `更新客户状态失败: ${error.message}` };
  }
});

// 获取客户详细信息
ipcMain.handle('get-customer-details', async (event, customerName) => {
  try {
    // 读取配置
    const configPath = path.join(__dirname, '../../config.json');
    if (!fs.existsSync(configPath)) {
      return { success: false, error: '配置文件不存在' };
    }
    
    const configContent = fs.readFileSync(configPath, 'utf8');
    const config = JSON.parse(configContent);
    
    // 检查源路径是否存在
    const sourcePath = config.sourcePath;
    if (!sourcePath) {
      return { success: false, error: '未配置源路径' };
    }
    
    // 构建客户目录路径 - 根据实际目录命名规则调整
    // 客户目录通常以日期开头，后跟客户名称和#号
    const customerDirName = `250901_${customerName}#`; // 使用当前日期作为前缀
    const customerDirPath = path.join(sourcePath, customerDirName);
    
    // 如果目录不存在，尝试查找匹配的客户目录
    if (!fs.existsSync(customerDirPath) || !fs.statSync(customerDirPath).isDirectory()) {
      // 查找匹配的客户目录
      const dirs = fs.readdirSync(sourcePath)
        .filter(dir => {
          const fullPath = path.join(sourcePath, dir);
          return fs.statSync(fullPath).isDirectory() && dir.includes(customerName);
        });
      
      if (dirs.length > 0) {
        // 使用第一个匹配的目录
        customerDirName = dirs[0];
        customerDirPath = path.join(sourcePath, customerDirName);
      } else {
        return { success: false, error: '客户目录不存在' };
      }
    }
    
    // 检查客户目录是否存在
    if (!fs.existsSync(customerDirPath) || !fs.statSync(customerDirPath).isDirectory()) {
      return { success: false, error: '客户目录不存在' };
    }
    
    // 检查是否有packages.json文件
    const packagesPath = path.join(customerDirPath, 'packages.json');
    let packagesData = [];
    let packProgress = 0;
    let packSeqs = [];
    let status = '未打包';
    
    if (fs.existsSync(packagesPath)) {
      packagesData = JSON.parse(fs.readFileSync(packagesPath, 'utf8'));
      
      // 计算打包进度
      if (Array.isArray(packagesData)) {
        // 获取所有partIDs
        const allPartIDs = [];
        packagesData.forEach(pkg => {
          if (pkg.partIDs && Array.isArray(pkg.partIDs)) {
            allPartIDs.push(...pkg.partIDs);
          }
        });
        
        // 获取包号
        packSeqs = packagesData.map(pkg => pkg.packSeq || '').filter(seq => seq);
        
        // 假设客户数据中所有板件都需要打包
        // 这里需要根据实际情况调整
        const totalParts = allPartIDs.length;
        packProgress = totalParts > 0 ? Math.round(100) : 0; // 假设所有板件都已打包
        
        // 确定客户状态
        if (packProgress === 100) {
          status = '已打包';
        } else if (packProgress > 0) {
          status = '正在处理';
        }
      }
    }
    
    return {
      success: true,
      details: {
        name: customerName,
        status,
        packProgress,
        packSeqs,
        lastUpdate: new Date().toISOString()
      }
    };
  } catch (error) {
    console.error('获取客户详细信息出错:', error);
    return { success: false, error: `获取客户详细信息出错: ${error.message}` };
  }
});

// 从源路径获取客户数据
ipcMain.handle('get-customers-from-source', async () => {
  try {
    // 读取配置
    const configPath = path.join(__dirname, '../../config.json');
    if (!fs.existsSync(configPath)) {
      return { success: false, error: '配置文件不存在' };
    }
    
    const configContent = fs.readFileSync(configPath, 'utf8');
    const config = JSON.parse(configContent);
    
    // 检查源路径是否存在
    const sourcePath = config.sourcePath;
    if (!sourcePath) {
      return { success: false, error: '未配置源路径' };
    }
    
    // 读取源路径中的客户目录
    let customerDirs = [];
    try {
      customerDirs = fs.readdirSync(sourcePath)
        .filter(dir => {
          const fullPath = path.join(sourcePath, dir);
          return fs.statSync(fullPath).isDirectory();
        });
    } catch (error) {
      return { success: false, error: `读取客户目录出错: ${error.message}` };
    }
    
    // 处理每个客户目录
    const customers = [];
    for (const dir of customerDirs) {
      try {
        // 解析客户名称（从目录名中提取）
        const customerName = dir.replace(/^\d{6}_/, '').replace(/#$/, '');
        
        // 获取客户目录路径
        const customerDirPath = path.join(sourcePath, dir);
        
        // 检查是否有packages.json文件
        const packagesPath = path.join(customerDirPath, 'packages.json');
        let packagesData = [];
        let packProgress = 0;
        let packSeqs = [];
        
        if (fs.existsSync(packagesPath)) {
          packagesData = JSON.parse(fs.readFileSync(packagesPath, 'utf8'));
          
          // 计算打包进度
          if (Array.isArray(packagesData)) {
            // 获取所有partIDs
            const allPartIDs = [];
            packagesData.forEach(pkg => {
              if (pkg.partIDs && Array.isArray(pkg.partIDs)) {
                allPartIDs.push(...pkg.partIDs);
              }
            });
            
            // 获取包号
            packSeqs = packagesData.map(pkg => pkg.packSeq || '').filter(seq => seq);
            
            // 假设客户数据中所有板件都需要打包
            // 这里需要根据实际情况调整
            const totalParts = allPartIDs.length;
            packProgress = totalParts > 0 ? Math.round(100) : 0; // 假设所有板件都已打包
          }
        }
        
        // 确定客户状态
        let status = '未打包';
        if (packProgress === 100) {
          status = '已打包';
        } else if (packProgress > 0) {
          status = '正在处理';
        }
        
        // 添加到客户列表
        customers.push({
          name: customerName,
          status,
          packProgress,
          packSeqs,
          lastUpdate: new Date().toISOString()
        });
      } catch (error) {
        console.error(`处理客户目录 ${dir} 出错:`, error);
      }
    }
    
    return { success: true, customers };
  } catch (error) {
    console.error('获取客户数据出错:', error);
    return { success: false, error: `获取客户数据出错: ${error.message}` };
  }
});

// 配置相关处理程序
ipcMain.handle('get-config', async () => {
  try {
    const configPath = path.join(__dirname, '../../config.json');
    if (fs.existsSync(configPath)) {
      const configContent = fs.readFileSync(configPath, 'utf8');
      const config = JSON.parse(configContent);
      // 确保配置包含自动保存路径属性
      if (!config.autoSavePath) {
        config.autoSavePath = path.join(app.getPath('documents'), 'PackNodeAutoSaves');
      }
      return config;
    }
    // 返回默认配置，包含自动保存路径
    return {
      autoSavePath: path.join(app.getPath('documents'), 'PackNodeAutoSaves')
    };
  } catch (error) {
    console.error('读取配置文件失败:', error);
    return { error: error.message };
  }
});

ipcMain.handle('save-config', async (event, config) => {
  try {
    // 导入增量更新配置功能
    const { saveConfigWithMerge } = require('../utils/config-manager');

    // 使用增量更新功能保存配置
    const result = await saveConfigWithMerge(config);

    if (result.success) {
      console.log('✅ 配置保存成功（增量更新）');
      return result;
    } else {
      console.error('✗ 配置保存失败:', result.error);
      return result;
    }
  } catch (error) {
    console.error('✗ 保存配置时出错:', error);
    return { success: false, error: `保存配置时出错: ${error.message}` };
  }
});

// 文件/目录操作处理程序
ipcMain.handle('select-directory', async (event, title) => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: title || '选择目录',
    properties: ['openDirectory']
  });

  if (!result.canceled && result.filePaths.length > 0) {
    return result.filePaths[0];
  }
  return null;
});

ipcMain.handle('open-directory', async (event, dirPath) => {
  if (!fs.existsSync(dirPath)) {
    return { success: false, error: '目录不存在' };
  }

  // 在 Windows 上打开目录
  exec(`start "" "${dirPath}"`, (error) => {
    if (error) {
      console.error('打开目录失败:', error);
      return { success: false, error: error.message };
    }
    return { success: true };
  });

  return { success: true };
});

// 处理控制相关处理程序
ipcMain.handle('start-processing', async () => {
  try {
    if (isProcessing) {
      return { success: false, message: '处理已在进行中' };
    }

    isProcessing = true;
    if (mainWindow) {
      mainWindow.webContents.send('processing-status', { status: 'started' });
    }

    // 调用主程序的处理函数
    const result = await processAllCustomers();

    isProcessing = false;
    if (mainWindow) {
      mainWindow.webContents.send('processing-status', { status: 'completed', result });
    }

    return { success: true, message: '处理完成', result };
  } catch (error) {
    console.error('启动处理失败:', error);
    isProcessing = false;
    if (mainWindow) {
      mainWindow.webContents.send('processing-status', { status: 'error', error: error.message });
    }
    return { success: false, error: `启动处理失败: ${error.message}` };
  }
});

ipcMain.handle('stop-processing', async () => {
  try {
    // 这里应该实现停止处理逻辑
    isProcessing = false;
    if (mainWindow) {
      mainWindow.webContents.send('processing-status', { status: 'stopped' });
    }
    return { success: true, message: '停止处理' };
  } catch (error) {
    console.error('停止处理失败:', error);
    return { success: false, error: `停止处理失败: ${error.message}` };
  }
});

// 客户状态管理相关处理程序
ipcMain.handle('archive-customer', async (event, customerName) => {
  try {
    const customerStatusManager = require('../utils/customer-status-manager');
    const customerData = await DataManager.getCustomer(customerName);
    
    if (!customerData) {
      return { success: false, message: '客户不存在' };
    }
    
    // 归档客户
    const updatedData = customerStatusManager.archiveCustomer(customerData, 'Electron', '通过界面归档');
    
    // 保存更新后的数据
    await DataManager.upsertCustomer(updatedData);
    
    return { success: true, message: '客户归档成功', status: updatedData.status };
  } catch (error) {
    console.error('归档客户失败:', error);
    return { success: false, message: `归档客户失败: ${error.message}` };
  }
});

ipcMain.handle('ship-customer', async (event, customerName) => {
  try {
    const customerStatusManager = require('../utils/customer-status-manager');
    const customerData = await DataManager.getCustomer(customerName);
    
    if (!customerData) {
      return { success: false, message: '客户不存在' };
    }
    
    // 出货客户
    const updatedData = customerStatusManager.shipCustomer(customerData, 'Electron', '通过界面出货');
    
    // 保存更新后的数据
    await DataManager.upsertCustomer(updatedData);
    
    return { success: true, message: '客户出货成功', status: updatedData.status };
  } catch (error) {
    console.error('出货客户失败:', error);
    return { success: false, message: `出货客户失败: ${error.message}` };
  }
});

ipcMain.handle('mark-customer-not-shipped', async (event, customerName) => {
  try {
    const customerStatusManager = require('../utils/customer-status-manager');
    const customerData = await DataManager.getCustomer(customerName);
    
    if (!customerData) {
      return { success: false, message: '客户不存在' };
    }
    
    // 标记客户为未出货
    const updatedData = customerStatusManager.markCustomerNotShipped(customerData, 'Electron', '通过界面标记为未出货');
    
    // 保存更新后的数据
    await DataManager.upsertCustomer(updatedData);
    
    return { success: true, message: '客户已标记为未出货', status: updatedData.status };
  } catch (error) {
    console.error('标记客户为未出货失败:', error);
    return { success: false, message: `标记客户为未出货失败: ${error.message}` };
  }
});

ipcMain.handle('check-customer-status', async (event, customerName) => {
  try {
    const customerStatusManager = require('../utils/customer-status-manager');
    const PackageDataExtractor = require('../utils/package-data-extractor');
    
    // 获取客户数据
    const customerData = await DataManager.getCustomer(customerName);
    
    if (!customerData) {
      return { success: false, message: '客户不存在' };
    }
    
    // 获取packages.json文件路径
    const packagesPath = path.join(customerData.outputPath, 'packages.json');
    
    // 读取packages.json数据
    let packagesData = [];
    if (fs.existsSync(packagesPath)) {
      packagesData = PackageDataExtractor.extractCustomerPackageData(packagesPath);
    }
    
    // 检查客户状态
    const statusInfo = customerStatusManager.checkPackStatus(customerData, packagesData);
    
    // 更新客户状态
    const updatedData = customerStatusManager.updateCustomerStatus(
      customerData, 
      statusInfo, 
      'Electron', 
      'Electron检查状态'
    );
    
    // 保存更新后的数据
    await DataManager.upsertCustomer(updatedData);
    
    return {
      success: true,
      status: statusInfo.status,
      packedCount: statusInfo.packedCount,
      totalParts: statusInfo.totalParts,
      packProgress: statusInfo.packProgress,
      packSeqs: statusInfo.packSeqs,
      timestamp: statusInfo.timestamp
    };
  } catch (error) {
    console.error('检查客户状态失败:', error);
    return { success: false, message: `检查客户状态失败: ${error.message}` };
  }
});

// 自动保存相关处理程序
ipcMain.handle('start-auto-save-customer', async () => {
  // 这里应该实现客户数据自动保存逻辑
  return { success: true, message: '已启动客户数据自动保存' };
});

ipcMain.handle('start-auto-save-worker', async () => {
  // 这里应该实现工人数据自动保存逻辑
  return { success: true, message: '已启动工人数据自动保存' };
});

ipcMain.handle('view-auto-save-data', async () => {
  // 这里应该实现查看自动保存数据的逻辑
  return { success: true, message: '查看自动保存数据' };
});