const fs = require('fs');
const path = require('path');

const { logError, logInfo, logSuccess, logWarning } = require('./utils/logger');
const { processCustomerData } = require('./utils/customer-data-processor');
// 已根据 old 目录文件完善输出的客户表格数据和格式，添加了第二个工作表（已打包）
const { checkDataIntegrity } = require('./utils/data-integrity-check');
// 注释掉不存在的模块引用
// const { networkMonitor } = require('./network/network-monitor');
const CleanupTask = require('./utils/cleanup-task');
const DataManager = require('./utils/data-manager');

// 添加Electron支持
let isElectron = false;

try {
  // 尝试检测Electron环境
  if (process.versions && process.versions.electron) {
    isElectron = true;
  }
} catch (e) {
  // Electron环境不可用
}

// 读取配置文件
const configPath = path.join(__dirname, '../config.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

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

// 启动定时清理任务
CleanupTask.start();

/**
 * 处理所有客户数据
 */
async function processAllCustomers() {
  try {
    console.log('🚀 开始处理客户数据...');

    // 确保源目录存在
    const sourceBaseDir = config.sourcePath;
    if (!fs.existsSync(sourceBaseDir)) {
      console.log(`❌ 源基础目录不存在: ${sourceBaseDir}`);
      return { successCount: 0, totalCustomers: 0 };
    }

    // 读取所有客户目录
    const customerDirs = fs.readdirSync(sourceBaseDir).filter(dir =>
      fs.statSync(path.join(sourceBaseDir, dir)).isDirectory()
    );

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

        if (result) {
          successCount++;
        }

        // 更新客户状态到数据管理器
        DataManager.upsertCustomer({
          name: customerDir,
          sourcePath: customerPath,
          outputPath: customerOutputDir,
          status: result ? '已处理' : '处理失败',
          lastUpdate: new Date().toISOString(),
          success: result
        });
      } catch (error) {
        console.error(`✗ 处理客户 ${customerDir} 时出错:`, error.message);
        DataManager.updateCustomerStatus(customerDir, '处理失败', error.message);
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

// 程序入口点
async function main() {
  // 如果在Electron环境中，不要立即执行，而是等待UI触发
  if (isElectron) {
    console.log(' Electron环境中，等待UI触发处理...');
    // 在Electron环境中，我们导出函数供UI调用
    return;
  }

  // 在非Electron环境中，直接执行
  await processAllCustomers();
}

// 只有在直接运行此脚本时才执行main函数
if (require.main === module) {
  main().catch(error => {
    console.error('程序执行出错:', error);
    process.exit(1);
  });
}

// 导出函数供其他模块使用
module.exports = {
  processAllCustomers,
  getCustomerDirectoryName
};