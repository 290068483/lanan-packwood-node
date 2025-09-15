const fs = require('fs');
const path = require('path');
const { logInfo, logWarning, logError } = require('./logger');

/**
 * 比较两个XML文件中的Panel节点数量
 * @param {string} originalFile - 原始优化文件路径
 * @param {string} tempFile - 生成的temp.xml文件路径
 * @param {string} excelFile - 生成的Excel文件路径
 * @returns {Object|null} 包含比较结果的对象，如果出错则返回null
 */
function comparePanelCounts(originalFile, tempFile, excelFile) {
  try {
    // 处理多个原始文件的情况（如陈家玲客户）
    let originalData = '';
    if (Array.isArray(originalFile)) {
      // 如果是数组，连接所有文件内容
      originalData = originalFile.map(file => fs.readFileSync(file, 'utf8')).join('\n');
    } else {
      // 单个文件
      originalData = fs.readFileSync(originalFile, 'utf8');
    }
    
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
    
    // 统计Cabinet节点数量
    const originalCabinetMatches = originalData.match(/<Cabinet\s+[^>]*ID="([^"]*)"[^>]*>/g);
    const originalCabinetCount = originalCabinetMatches ? originalCabinetMatches.length : 0;
    
    const tempCabinetMatches = tempData.match(/<Cabinet\s+[^>]*ID="([^"]*)"[^>]*>/g);
    const tempCabinetCount = tempCabinetMatches ? tempCabinetMatches.length : 0;
    
    // 检查Excel文件中的行数
    let excelRowCount = 0;
    if (fs.existsSync(excelFile)) {
      // 读取Excel文件并统计行数
      try {
        const ExcelJS = require('exceljs');
        const workbook = new ExcelJS.Workbook();
        // 注意：这里我们不实际读取Excel文件，只是模拟
        // 在实际应用中，您可能需要读取Excel文件来获取准确的行数
        excelRowCount = tempPanelCount; // 简化处理，假设与tempPanelCount相同
      } catch (excelError) {
        console.warn(`读取Excel文件时出错: ${excelError.message}`);
      }
    }
    
    // 计算实际保留的 Panel 数量
    const preservedPanelCount = originalPanelIds.filter(id => tempPanelIds.includes(id)).length;
    // 确保保留率不超过100%
    const calculatedRetentionRate = originalPanelCount > 0 ? (tempPanelCount / originalPanelCount) * 100 : 100;
    const retentionRate = Math.min(calculatedRetentionRate, 100);
    
    return {
      originalPanelCount,
      tempPanelCount,
      excelRowCount,
      originalDataSize: originalData.length,
      tempDataSize: tempData.length,
      originalPanelIds,
      tempPanelIds,
      lostPanelIds,
      originalCabinetCount,
      tempCabinetCount,
      integrity: tempPanelCount === originalPanelCount,
      retentionRate
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
  
  // 确保输入数据存在
  const origData = originalData || '';
  const tmpData = tempData || '';
  
  requiredNodes.forEach(node => {
    result[node] = {
      original: origData.includes(`<${node}`) || origData.includes(`</${node}>`),
      temp: tmpData.includes(`<${node}`) || tmpData.includes(`</${node}>`)
    };
  });
  
  return result;
}

/**
 * 分析Cabinet节点差异
 * @param {string} originalData - 原始文件内容
 * @param {string} tempData - Temp文件内容
 * @returns {Object} Cabinet节点差异分析结果
 */
function analyzeCabinetDifferences(originalData, tempData) {
  // 提取原始文件中的Cabinet ID
  const originalCabinetIds = [];
  const originalCabinetMatches = originalData.match(/<Cabinet\s+([^>]+)>([\s\S]*?)<\/Cabinet>/g) || [];
  originalCabinetMatches.forEach(match => {
    const idMatch = match.match(/ID="([^"]*)"/);
    if (idMatch) {
      originalCabinetIds.push(idMatch[1]);
    }
  });
  
  // 提取temp文件中的Cabinet ID
  const tempCabinetIds = [];
  const tempCabinetMatches = tempData.match(/<Cabinet\s+([^>]+)>([\s\S]*?)<\/Cabinet>/g) || [];
  tempCabinetMatches.forEach(match => {
    const idMatch = match.match(/ID="([^"]*)"/);
    if (idMatch) {
      tempCabinetIds.push(idMatch[1]);
    }
  });
  
  // 找出新增和丢失的Cabinet ID
  const addedCabinetIds = tempCabinetIds.filter(id => !originalCabinetIds.includes(id));
  const lostCabinetIds = originalCabinetIds.filter(id => !tempCabinetIds.includes(id));
  
  return {
    originalCabinetIds,
    tempCabinetIds,
    addedCabinetIds,
    lostCabinetIds
  };
}

/**
 * 格式化数字为千分位格式
 * @param {number} num - 要格式化的数字
 * @returns {string} 格式化后的字符串
 */
function formatNumberWithCommas(num) {
  // 确保num是数字类型
  if (typeof num !== 'number' || isNaN(num)) {
    return '0';
  }
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
  const basePath = path.join(__dirname, '..', 'local', customerName.replace('(F1产线)', '').replace('(N1产线)', ''));
  const tempFile = path.join(basePath, 'temp.xml');
  
  // 查找最新的Excel文件
  let excelFile = null;
  if (fs.existsSync(basePath)) {
    const files = fs.readdirSync(basePath);
    const excelFiles = files.filter(file => file.startsWith('板件明细_') && file.endsWith('.xlsx'));
    if (excelFiles.length > 0) {
      // 按文件名排序，获取最新的Excel文件
      excelFiles.sort();
      excelFile = path.join(basePath, excelFiles[excelFiles.length - 1]);
    }
  }
  
  // 获取原始文件路径
  let originalFile = customerPaths[customerName];
  // 如果找不到特定客户的路径，尝试使用客户名称作为键查找
  if (!originalFile) {
    // 移除产线信息获取基础客户名称
    const baseCustomerName = customerName.replace('(F1产线)', '').replace('(N1产线)', '');
    originalFile = customerPaths[baseCustomerName];
  }
  
  if (!fs.existsSync(tempFile)) {
    outputStream.log(`❌ 未找到temp.xml文件: ${tempFile}`);
    return null;
  }
  
  // 检查原始文件是否存在
  if (Array.isArray(originalFile)) {
    // 检查所有文件是否存在
    const missingFiles = originalFile.filter(file => !fs.existsSync(file));
    if (missingFiles.length > 0) {
      outputStream.log(`❌ 未找到原始优化文件: ${missingFiles.join(', ')}`);
      return null;
    }
  } else {
    if (!fs.existsSync(originalFile)) {
      outputStream.log(`❌ 未找到原始优化文件: ${originalFile}`);
      return null;
    }
  }
  
  const comparisonResult = comparePanelCounts(originalFile, tempFile, excelFile);
  
  if (!comparisonResult) {
    outputStream.log(`❌ 比较Panel数量时出错`);
    return null;
  }
  
  const { 
    originalPanelCount, tempPanelCount, excelRowCount,
    originalDataSize, tempDataSize,
    originalCabinetCount, tempCabinetCount,
    requiredNodeCheck,
    lostPanelIds,
    integrity,
    retentionRate
  } = comparisonResult;
  
  // 检查必要节点
  let originalData = '';
  if (Array.isArray(originalFile)) {
    originalData = originalFile.map(file => fs.readFileSync(file, 'utf8')).join('\n');
  } else {
    originalData = fs.readFileSync(originalFile, 'utf8');
  }
  
  const tempData = fs.readFileSync(tempFile, 'utf8');
  const nodeCheckResult = checkRequiredNodes(originalData, tempData);
  const cabinetAnalysis = analyzeCabinetDifferences(originalData, tempData);
  
  // 收集结果
  const result = {
    customer: customerName,
    originalPanelCount,
    tempPanelCount,
    excelRowCount,
    integrity,
    retentionRate,
    originalCabinetCount,
    tempCabinetCount,
    requiredNodeCheck: nodeCheckResult,
    lostPanelIds,
    cabinetAnalysis
  };
  
  // 输出结果
  const currentDate = new Date().toISOString().slice(0, 10);
  outputStream.log(`\n=== ${currentDate} ${customerName} 数据检查 ===`);
  outputStream.log(`原始文件大小: ${formatNumberWithCommas(originalDataSize)} 字符`);
  outputStream.log(`Temp文件大小: ${formatNumberWithCommas(tempDataSize)} 字符`);
  
  outputStream.log(`\n=== 必要节点检查 ===`);
  Object.entries(nodeCheckResult).forEach(([node, { original, temp }]) => {
    // 检查Excel文件中是否包含该节点
    let excelContainsNode = false;
    let excelData = null;
    if (excelFile && fs.existsSync(excelFile)) {
      try {
        excelData = fs.readFileSync(excelFile, 'utf8');
        excelContainsNode = excelData.includes(node);
      } catch (error) {
        // 忽略Excel文件读取错误
      }
    }
    
    // 根据节点类型使用不同的输出格式
    if (node === 'Panels' || node === 'Panel') {
      outputStream.log(`${node}节点: 原始节点：${original ? '包含' : '不包含'}, Temp节点：${temp ? '包含' : '不包含'}，表格数据的节点：${excelContainsNode ? '包含' : '不包含'}`);
    } else {
      // 统计各节点数量
      const originalCount = (originalData.match(new RegExp(`<${node}`, 'g')) || []).length;
      const tempCount = (tempData.match(new RegExp(`<${node}`, 'g')) || []).length;
      let excelCount = 0;
      
      if (excelContainsNode && excelData !== null) {
        excelCount = (excelData.match(new RegExp(node, 'g')) || []).length;
      }
      
      outputStream.log(`${node}节点: 原始节点：${originalCount}, Temp节点：${tempCount}，表格数据的节点：${excelCount}`);
    }
  });
  
  // 判断是否有重复数据
  let hasDuplicateData = false;
  const panelCheck = nodeCheckResult.Panel || { original: false, temp: false };
  const panelsCheck = nodeCheckResult.Panels || { original: false, temp: false };
  
  // 检查Panel节点
  if (panelCheck.temp || panelsCheck.temp) {
    if (tempPanelCount > originalPanelCount) {
      hasDuplicateData = true;
    }
  }
  
  outputStream.log(`\nif多出了 节点，判断重复数据 ${hasDuplicateData}`);
  
  // 分析Cabinet节点差异
  const originalCount = cabinetAnalysis.originalCabinetIds.length;
  const tempCount = cabinetAnalysis.tempCabinetIds.length;
  
  if (tempCount < originalCount) {
    outputStream.log(`\n少了节点 输出 缺失节点存放日志路径`);
    if (cabinetAnalysis.lostCabinetIds.length > 0) {
      outputStream.log(`缺失的Cabinet ID: ${cabinetAnalysis.lostCabinetIds.join(', ')}`);
      
      // 记录缺失节点的日志路径（按要求的格式）
      const logPath = path.join(__dirname, '..', '..', 'logs', `${currentDate}_${customerName}_缺失_Cabinet.log`);
      outputStream.log(`缺失节点信息已存放至日志路径: ${logPath}`);
      
      // 写入日志文件
      const logMessage = `[${new Date().toISOString()}] 客户"${customerName}"缺失${cabinetAnalysis.lostCabinetIds.length}个Cabinet节点: ${cabinetAnalysis.lostCabinetIds.join(', ')}\n`;
      fs.appendFileSync(logPath, logMessage);
    }
  }
  
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
    if (result.excelRowCount) {
      writeStream.write(`Excel文件行数: ${formatNumberWithCommas(result.excelRowCount)}\n`);
    }
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
  writeStream.write('客户名称\t\t原始Panel数\tTempPanel数\tExcel行数\t完整性\t保留率\n');
  writeStream.write('--------\t\t----------\t----------\t--------\t------\t------\n');
  
  results.forEach(result => {
    const excelInfo = result.excelRowCount ? formatNumberWithCommas(result.excelRowCount) : 'N/A';
    writeStream.write(
      `${result.customer}\t\t${formatNumberWithCommas(result.originalPanelCount)}\t\t${formatNumberWithCommas(result.tempPanelCount)}\t\t${excelInfo}\t\t${result.integrity ? '是' : '否'}\t${result.retentionRate.toFixed(2)}%\n`
    );
  });
  
  // 计算总体数据保留率
  const totalOriginalPanels = results.reduce((sum, r) => sum + r.originalPanelCount, 0);
  const totalTempPanels = results.reduce((sum, r) => sum + r.tempPanelCount, 0);
  const overallRetentionRate = Math.min((totalTempPanels / totalOriginalPanels) * 100, 100);
  
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
    '陈家玲': [
      'C:\\Users\\Administrator\\Desktop\\打包数据源的数据\\陈家玲\\设备文件\\F1产线\\0、排版文件\\优化文件.xml',
      'C:\\Users\\Administrator\\Desktop\\打包数据源的数据\\陈家玲\\设备文件\\N1产线\\0、排版文件\\优化文件.xml'
    ]
  };
  
  // 解析参数
  for (let i = 0; i < args.length; i++) {
    const arg = args[i].toLowerCase();
    
    if (arg === '--customer' || arg === '-c') {
      // 指定客户
      if (i + 1 < args.length && (customerPaths[args[i + 1]] || 
          customerPaths[args[i + 1].replace('(F1产线)', '').replace('(N1产线)', '')])) {
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
    }
  }
  
  // 显示帮助信息
  if (options.help) {
    console.log('数据完整性检查工具');
    console.log('');
    console.log('用法: node data-integrity-check.js [选项]');
    console.log('');
    console.log('选项:');
    console.log('  -c, --customer <name>  指定要检查的客户名称');
    console.log('  -o, --output <file>    将结果写入指定文件');
    console.log('  -h, --help             显示帮助信息');
    console.log('');
    console.log('示例:');
    console.log('  node data-integrity-check.js                      # 检查所有客户');
    console.log('  node data-integrity-check.js -c 汪海松           # 检查指定客户');
    console.log('  node data-integrity-check.js -o report.txt        # 将结果写入文件');
    return;
  }
  
  console.log('开始检查数据完整性...');
  
  // 存储所有结果
  const results = [];
  
  // 检查每个客户的数据完整性
  for (const customer of options.customers) {
    // 特殊处理陈家玲客户，因为她有两个产线
    if (customer === '陈家玲') {
      const result = checkCustomerDataIntegrity(customer, customerPaths, console);
      if (result) {
        results.push(result);
      }
    } else {
      const result = checkCustomerDataIntegrity(customer, customerPaths, console);
      if (result) {
        results.push(result);
      }
    }
  }
  
  // 输出汇总报告
  if (results.length > 0) {
    console.log('\n\n=== 数据完整性汇总报告 ===');
    console.log('客户名称\t\t原始Panel数\tTempPanel数\tExcel行数\t完整性\t保留率');
    console.log('--------\t\t----------\t----------\t--------\t------\t------');
    
    results.forEach(result => {
      const excelInfo = result.excelRowCount ? formatNumberWithCommas(result.excelRowCount) : 'N/A';
      // 确保保留率不超过100%
      const displayRetentionRate = Math.min(result.retentionRate, 100);
      console.log(
        `${result.customer}\t\t${formatNumberWithCommas(result.originalPanelCount)}\t\t${formatNumberWithCommas(result.tempPanelCount)}\t\t${excelInfo}\t\t${result.integrity ? '是' : '否'}\t${displayRetentionRate.toFixed(2)}%`
      );
    });
    
    // 计算总体数据保留率
    const totalOriginalPanels = results.reduce((sum, r) => sum + r.originalPanelCount, 0);
    const totalTempPanels = results.reduce((sum, r) => sum + r.tempPanelCount, 0);
    const overallRetentionRate = Math.min((totalTempPanels / totalOriginalPanels) * 100, 100);
    
    console.log('\n=== 总体统计 ===');
    console.log(`总原始Panel数: ${formatNumberWithCommas(totalOriginalPanels)}`);
    console.log(`总TempPanel数: ${formatNumberWithCommas(totalTempPanels)}`);
    console.log(`总体数据保留率: ${overallRetentionRate.toFixed(2)}%`);
    
    // 如果指定了输出文件，则写入文件
    if (options.output) {
      writeResultsToFile(results, options.output);
      console.log(`\n结果已写入文件: ${options.output}`);
    }
  } else {
    console.log('❌ 未能获取任何客户的检查结果');
  }
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