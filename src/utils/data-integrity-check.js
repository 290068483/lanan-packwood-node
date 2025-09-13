const fs = require('fs');
const path = require('path');
const { logInfo, logWarning, logError } = require('./logger');

/**
 * 比较两个XML文件中的Panel节点数量
 * @param {string} originalFile - 原始优化文件路径
 * @param {string} tempFile - 生成的temp.xml文件路径
 * @returns {Object|null} 包含比较结果的对象，如果出错则返回null
 */
function comparePanelCounts(originalFile, tempFile) {
  try {
    // 读取原始文件
    const originalData = fs.readFileSync(originalFile, 'utf8');
    
    // 读取temp文件
    const tempData = fs.readFileSync(tempFile, 'utf8');
    
    // 使用正则表达式统计Panel节点数量
    const originalPanelMatches = originalData.match(/<Panel\s+[^>]*Uid="([^"]*)"[^>]*>/g);
    const originalPanelCount = originalPanelMatches ? originalPanelMatches.length : 0;
    
    const tempPanelMatches = tempData.match(/<Panel\s+[^>]*Uid="([^"]*)"[^>]*>/g);
    const tempPanelCount = tempPanelMatches ? tempPanelMatches.length : 0;
    
    // 提取原始文件中的所有Panel ID
    const originalPanelIds = [];
    if (originalPanelMatches) {
      originalPanelMatches.forEach(match => {
        const idMatch = match.match(/Uid="([^"]*)"/);
        if (idMatch) {
          originalPanelIds.push(idMatch[1]);
        }
      });
    }
    
    // 提取temp文件中的所有Panel ID
    const tempPanelIds = [];
    if (tempPanelMatches) {
      tempPanelMatches.forEach(match => {
        const idMatch = match.match(/Uid="([^"]*)"/);
        if (idMatch) {
          tempPanelIds.push(idMatch[1]);
        }
      });
    }
    
    // 找出丢失的Panel ID
    const lostPanelIds = originalPanelIds.filter(id => !tempPanelIds.includes(id));
    
    return {
      originalPanelCount,
      tempPanelCount,
      originalDataSize: originalData.length,
      tempDataSize: tempData.length,
      originalPanelIds,
      tempPanelIds,
      lostPanelIds,
      integrity: tempPanelCount === originalPanelCount,
      retentionRate: (tempPanelCount / originalPanelCount) * 100
    };
  } catch (error) {
    console.error('检查数据完整性时出错:', error.message);
    return null;
  }
}

/**
 * 统计XML字符串中的Cabinet节点数量
 * @param {string} xmlData - XML文件内容
 * @returns {number} Cabinet节点数量
 */
function countXmlNodeTags(xmlData) {
  const matches = xmlData.match(/<\/Cabinet>/g);
  return matches ? matches.length : 0;
}

/**
 * 检查是否包含必要的节点
 * @param {string} originalData - 原始文件内容
 * @param {string} tempData - Temp文件内容
 * @returns {Object} 必要节点检查结果
 */
function checkRequiredNodes(originalData, tempData) {
  const requiredNodes = ['Root', 'Cabinet', 'Panels', 'Panel'];
  const result = {};
  
  requiredNodes.forEach(node => {
    result[node] = {
      original: originalData.includes(`<${node}`) || originalData.includes(`</${node}>`),
      temp: tempData.includes(`<${node}`) || tempData.includes(`</${node}>`)
    };
  });
  
  return result;
}

/**
 * 格式化数字为千分位格式
 * @param {number} num - 要格式化的数字
 * @returns {string} 格式化后的字符串
 */
function formatNumberWithCommas(num) {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/**
 * 检查特定客户的temp.xml与原始文件的数据完整性
 * @param {string} customerName - 客户名称
 * @param {Object} customerPaths - 客户路径配置
 * @param {string} [outputStream=console] - 输出流，默认为控制台
 * @returns {Object|null} 包含检查结果的对象，如果出错则返回null
 */
function checkCustomerDataIntegrity(customerName, customerPaths, outputStream = console) {
  const basePath = path.join(__dirname, '..', 'local', customerName);
  const tempFile = path.join(basePath, 'temp.xml');
  
  const originalFile = customerPaths[customerName];
  
  if (!fs.existsSync(tempFile)) {
    outputStream.log(`❌ 未找到temp.xml文件: ${tempFile}`);
    return;
  }
  
  if (!fs.existsSync(originalFile)) {
    outputStream.log(`❌ 未找到原始优化文件: ${originalFile}`);
    return;
  }
  
  const { 
    originalPanelCount, tempPanelCount,
    originalDataSize, tempDataSize,
    originalCabinetCount, tempCabinetCount,
    requiredNodeCheck,
    lostPanelIds
  } = comparePanelCounts(originalFile, tempFile);
  
  const integrity = tempPanelCount === originalPanelCount;
  const retentionRate = (tempPanelCount / originalPanelCount) * 100;
  
  // 收集结果
  const result = {
    customer: customerName,
    originalPanelCount,
    tempPanelCount,
    integrity,
    retentionRate,
    originalCabinetCount,
    tempCabinetCount,
    requiredNodeCheck,
    lostPanelIds
  };
  
  // 输出结果
  outputStream.log(`\n=== 检查客户 "${customerName}" 的数据完整性 ===`);
  outputStream.log(`原始文件大小: ${formatNumberWithCommas(originalDataSize)} 字符`);
  outputStream.log(`Temp文件大小: ${formatNumberWithCommas(tempDataSize)} 字符`);
  
  outputStream.log(`\n=== Panel节点数量对比 ===`);
  outputStream.log(`原始文件Panel节点数: ${formatNumberWithCommas(originalPanelCount)}`);
  outputStream.log(`Temp文件Panel节点数: ${formatNumberWithCommas(tempPanelCount)}`);
  outputStream.log(`数据完整性: ${integrity ? '完整' : '不完整'}`);
  outputStream.log(`数据保留率: ${retentionRate.toFixed(2)}%`);
  
  // 如果有丢失的数据，记录日志
  if (lostPanelIds && lostPanelIds.length > 0) {
    outputStream.log(`\n=== 丢失的Panel数据 ===`);
    outputStream.log(`丢失Panel数量: ${lostPanelIds.length}`);
    outputStream.log(`丢失的Panel ID: ${lostPanelIds.join(', ')}`);
    
    // 记录到日志文件
    const logMessage = `客户"${customerName}"丢失${lostPanelIds.length}个Panel数据: ${lostPanelIds.join(', ')}`;
    logWarning(customerName, 'DATA_INTEGRITY', logMessage);
  }
  
  outputStream.log(`\n=== 文件结构对比 ===`);
  outputStream.log(`原始文件Cabinet节点数: ${formatNumberWithCommas(originalCabinetCount)}`);
  outputStream.log(`Temp文件Cabinet节点数: ${formatNumberWithCommas(tempCabinetCount)}`);
  
  outputStream.log(`\n=== 必要节点检查 ===`);
  Object.entries(requiredNodeCheck).forEach(([node, { original, temp }]) => {
    outputStream.log(`${node}节点: 原始文件${original ? '包含' : '不包含'}, Temp文件${temp ? '包含' : '不包含'}`);
  });
  
  return result;
}

/**
 * 将结果写入文件
 * @param {Array} results - 检查结果数组
 * @param {string} outputFile - 输出文件路径
 */
function writeResultsToFile(results, outputFile) {
  const writeStream = fs.createWriteStream(outputFile);
  
  // 写入详细结果
  results.forEach(result => {
    writeStream.write(`\n=== 检查客户 "${result.customer}" 的数据完整性 ===\n`);
    writeStream.write(`原始文件Panel节点数: ${formatNumberWithCommas(result.originalPanelCount)}\n`);
    writeStream.write(`Temp文件Panel节点数: ${formatNumberWithCommas(result.tempPanelCount)}\n`);
    writeStream.write(`数据完整性: ${result.integrity ? '完整' : '不完整'}\n`);
    writeStream.write(`数据保留率: ${result.retentionRate.toFixed(2)}%\n`);
    
    if (result.lostPanelIds && result.lostPanelIds.length > 0) {
      writeStream.write(`\n丢失Panel数量: ${result.lostPanelIds.length}\n`);
      writeStream.write(`丢失的Panel ID: ${result.lostPanelIds.join(', ')}\n`);
    }
    
    writeStream.write('\n=== 必要节点检查 ===\n');
    Object.entries(result.requiredNodeCheck).forEach(([node, { original, temp }]) => {
      writeStream.write(`${node}节点: 原始文件${original ? '包含' : '不包含'}, Temp文件${temp ? '包含' : '不包含'}\n`);
    });
    
    writeStream.write('\n----------------------------------------\n');
  });
  
  // 写入汇总报告
  writeStream.write('\n\n=== 数据完整性汇总报告 ===\n');
  writeStream.write('客户名称\t\t原始Panel数\tTempPanel数\t完整性\t保留率\n');
  writeStream.write('--------\t\t----------\t----------\t------\t------\n');
  
  results.forEach(result => {
    writeStream.write(
      `${result.customer}\t\t${formatNumberWithCommas(result.originalPanelCount)}\t\t${formatNumberWithCommas(result.tempPanelCount)}\t\t${result.integrity ? '是' : '否'}\t${result.retentionRate.toFixed(2)}%\n`
    );
  });
  
  // 计算总体数据保留率
  const totalOriginalPanels = results.reduce((sum, r) => sum + r.originalPanelCount, 0);
  const totalTempPanels = results.reduce((sum, r) => sum + r.tempPanelCount, 0);
  const overallRetentionRate = (totalTempPanels / totalOriginalPanels) * 100;
  
  writeStream.write(`\n=== 总体统计 ===\n`);
  writeStream.write(`总原始Panel数: ${formatNumberWithCommas(totalOriginalPanels)}\n`);
  writeStream.write(`总TempPanel数: ${formatNumberWithCommas(totalTempPanels)}\n`);
  writeStream.write(`总体数据保留率: ${overallRetentionRate.toFixed(2)}%\n`);
  
  writeStream.end();
}

// 主函数
function main(args = []) {
  // 解析命令行参数
  const options = {
    customers: ['汪海松', '肖妍柔', '蒋晓丽', '邱海岸', '陈家玲'],  // 默认检查所有客户
    output: null,  // 默认不写入文件
    help: false
  };
  
  // 根据客户确定原始文件路径
  const customerPaths = {
    '汪海松': 'C:\\Users\\Administrator\\Desktop\\打包数据源的数据\\汪海松\\设备文件\\N1产线\\0、排版文件\\优化文件.xml',
    '肖妍柔': 'C:\\Users\\Administrator\\Desktop\\打包数据源的数据\\肖妍柔\\设备文件\\N1产线\\0、排版文件\\优化文件.xml',
    '蒋晓丽': 'C:\\Users\\Administrator\\Desktop\\打包数据源的数据\\蒋晓丽\\设备文件\\N1产线\\0、排版文件\\优化文件.xml',
    '邱海岸': 'C:\\Users\\Administrator\\Desktop\\打包数据源的数据\\邱海岸\\设备文件\\N1产线\\0、排版文件\\优化文件.xml',
    '陈家玲': 'C:\\Users\\Administrator\\Desktop\\打包数据源的数据\\陈家玲\\设备文件\\N1产线\\0、排版文件\\优化文件.xml'
  };
  
  // 解析参数
  for (let i = 0; i < args.length; i++) {
    const arg = args[i].toLowerCase();
    
    if (arg === '--customer' || arg === '-c') {
      // 指定客户
      if (i + 1 < args.length && customerPaths[args[i + 1]]) {
        options.customers = [args[i + 1]];
        i++;
      }
    } else if (arg === '--output' || arg === '-o') {
      // 输出文件
      if (i + 1 < args.length) {
        options.output = args[i + 1];
        i++;
      }
    } else if (arg === '--help' || arg === '-h') {
      // 帮助信息
      options.help = true;
      break;
    }
  }
  
  // 显示帮助信息
  if (options.help) {
    console.log('数据完整性检查工具使用说明:');
    console.log('用法: node data-integrity-check.js [选项]');
    console.log('\n选项:');
    console.log('  --help, -h                显示帮助信息');
    console.log('  --customer <客户名>, -c <客户名>  指定要检查的客户（默认检查所有客户）');
    console.log('  --output <文件路径>, -o <文件路径>  将结果输出到文件（默认仅显示在控制台）');
    return;
  }
  
  console.log('开始检查数据完整性...\n');
  
  const results = [];
  
  options.customers.forEach(customer => {
    const result = checkCustomerDataIntegrity(customer, customerPaths, options.output ? { log: () => {} } : undefined);
    if (result) {
      results.push(result);
    }
  });
  
  // 如果指定了输出文件，写入结果
  if (options.output) {
    writeResultsToFile(results, options.output);
    console.log(`\n检查结果已写入文件: ${options.output}`);
  }
  
  // 计算总体数据保留率
  const totalOriginalPanels = results.reduce((sum, r) => sum + r.originalPanelCount, 0);
  const totalTempPanels = results.reduce((sum, r) => sum + r.tempPanelCount, 0);
  const overallRetentionRate = (totalTempPanels / totalOriginalPanels) * 100;
  
  // 控制台汇总报告
  console.log(`\n\n=== 数据完整性汇总报告 ===`);
  console.log('客户名称\t\t原始Panel数\tTempPanel数\t完整性\t保留率');
  console.log('--------\t\t----------\t----------\t------\t------');
  
  results.forEach(result => {
    console.log(
      `${result.customer}\t\t${formatNumberWithCommas(result.originalPanelCount)}\t\t${formatNumberWithCommas(result.tempPanelCount)}\t\t${result.integrity ? '是' : '否'}\t${result.retentionRate.toFixed(2)}%`
    );
  });
  
  console.log(`\n=== 总体统计 ===`);
  console.log(`总原始Panel数: ${formatNumberWithCommas(totalOriginalPanels)}`);
  console.log(`总TempPanel数: ${formatNumberWithCommas(totalTempPanels)}`);
  console.log(`总体数据保留率: ${overallRetentionRate.toFixed(2)}%`);
}

// 如果直接运行此脚本，则执行主函数
if (require.main === module) {
  // 传递命令行参数（忽略前两个默认参数）
  main(process.argv.slice(2));
}

module.exports = {
  comparePanelCounts,
  checkCustomerDataIntegrity
};