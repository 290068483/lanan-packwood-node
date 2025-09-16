const fs = require('fs');
const path = require('path');

const { logError, logInfo, logSuccess, logWarning } = require('./utils/logger');
const { processCustomerData } = require('./utils/customer-data-processor');
const { startNetworkMonitoring } = require('./network/network-sync');
const { checkCustomerDataIntegrity } = require('./utils/data-integrity-check');

// 读取配置文件
const configPath = path.join(__dirname, '..', 'config.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

// 启动网络状态监控
try {
  startNetworkMonitoring(config);
  logSuccess('SYSTEM', 'NETWORK', '网络监控已启动');
  console.log('✓ 网络监控已启动');
} catch (error) {
  logError(
    'SYSTEM',
    'NETWORK',
    `网络监控启动失败: ${error.message}`,
    error.stack
  );
  console.warn(`⚠ 网络监控启动失败: ${error.message}`);
}

/**
 * 检查数据完整性
 * @param {string} customerName - 客户名称
 * @param {string} customerOutputDir - 客户输出目录
 */
function checkDataIntegrity(customerName, customerOutputDir) {
  try {
    console.log(`\n🔍 正在检查 ${customerName} 的数据完整性...`);
    
    // 根据客户确定原始文件路径
    const customerPaths = {
      汪海松: path.join(
        config.sourcePath,
        '汪海松\\设备文件\\N1产线\\0、排版文件\\优化文件.xml'
      ),
      肖妍柔: path.join(
        config.sourcePath,
        '肖妍柔\\设备文件\\N1产线\\0、排版文件\\优化文件.xml'
      ),
      蒋晓丽: path.join(
        config.sourcePath,
        '蒋晓丽\\设备文件\\N1产线\\0、排版文件\\优化文件.xml'
      ),
      邱海岸: path.join(
        config.sourcePath,
        '邱海岸\\设备文件\\N1产线\\0、排版文件\\优化文件.xml'
      ),
      陈家玲: path.join(
        config.sourcePath,
        '陈家玲\\设备文件\\N1产线\\0、排版文件\\优化文件.xml'
      ),
    };

    // 检查数据完整性，传递正确的temp.xml路径
    const result = checkCustomerDataIntegrity(
      customerName,
      customerPaths,
      console,
      customerOutputDir
    );
    
    if (result) {
      // 记录完整性检查结果到日志
      logInfo(
        customerName,
        'DATA_INTEGRITY',
        `数据完整性检查完成: 保留率 ${result.retentionRate.toFixed(2)}%`
      );
      
      // 如果数据不完整，记录警告
      if (!result.integrity) {
        logWarning(
          customerName,
          'DATA_INTEGRITY',
          `数据不完整，丢失 ${result.lostPanelIds.length} 个Panel`
        );
      }
    }
  } catch (error) {
    console.error('✗ 数据完整性检查时出错:', error.message);
    logError(
      customerName,
      'DATA_INTEGRITY',
      `数据完整性检查时出错: ${error.message}`,
      error.stack
    );
  }
}

/**
 * 主函数
 */
async function main() {
  try {
    console.log('🚀 开始处理客户数据...');

    // 网络监控已经在模块加载时启动，这里不需要重复启动

    // 检查源路径和本地路径是否存在
    if (!fs.existsSync(config.sourcePath)) {
      console.error(`✗ 源路径不存在: ${config.sourcePath}`);
      process.exit(1);
    }

    if (!fs.existsSync(config.localPath)) {
      console.log(`ℹ 本地路径不存在，正在创建: ${config.localPath}`);
      fs.mkdirSync(config.localPath, { recursive: true });
    }

    // 获取所有客户目录
    const customerDirs = fs
      .readdirSync(config.sourcePath)
      .filter(dir => fs.statSync(path.join(config.sourcePath, dir)).isDirectory());

    if (customerDirs.length === 0) {
      console.warn('⚠ 未找到任何客户目录');
      process.exit(0);
    }

    let successCount = 0;
    // 处理每个客户
    for (const customerDir of customerDirs) {
      console.log(`\n📋 正在处理客户: ${customerDir}`);
      
      // 为客户创建输出目录，添加日期前缀和特殊符号防止其他机器修改文件名
      const dateStr = new Date().toISOString().slice(2, 10).replace(/-/g, '');
      const customerDirWithDateAndSymbol = `${dateStr} ${customerDir}#`;
      const customerOutputDir = path.join(config.localPath, customerDirWithDateAndSymbol);
      
      // 创建输出目录
      fs.mkdirSync(customerOutputDir, { recursive: true });
      
      // 处理客户数据
      const success = await processCustomerData(
        path.join(config.sourcePath, customerDir, '设备文件'),
        customerOutputDir,
        customerDir,
        config
      );

      if (success) {
        successCount++;
      }
      
      // 检查数据完整性，传递正确的客户输出目录
      checkDataIntegrity(customerDir, customerOutputDir);
    }

    console.log(`\n✅ 处理完成，成功处理 ${successCount} 个客户数据`);
  } catch (error) {
    console.error('✗ 处理客户数据时发生错误:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  main,
};