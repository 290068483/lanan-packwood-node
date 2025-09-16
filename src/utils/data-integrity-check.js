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
    
    // 计算丢失的Panel ID
    const lostPanelIds = originalPanelIds.filter(id => !tempPanelIds.includes(id));
    
    // 计算数据完整性
    const integrity = lostPanelIds.length === 0;
    
    // 计算数据保留率
    let retentionRate = 100;
    if (originalPanelCount > 0) {
      retentionRate = ((originalPanelCount - lostPanelIds.length) / originalPanelCount) * 100;
    }
    
    return {
      originalPanelCount,
      tempPanelCount,
      originalPanelIds,
      tempPanelIds,
      lostPanelIds,
      integrity,
      retentionRate
    };
  } catch (error) {
    console.error('比较Panel数量时出错:', error);
    return null;
  }
}

/**
 * 检查XML文件中的必要节点是否存在
 * @param {string} originalFile - 原始优化文件路径
 * @param {string} tempFile - 生成的temp.xml文件路径
 * @param {string} excelFile - 生成的Excel文件路径
 * @returns {Object} 包含检查结果的对象
 */
function checkRequiredNodes(originalFile, tempFile, excelFile) {
  try {
    // 读取文件内容
    let originalData = '';
    if (Array.isArray(originalFile)) {
      // 如果是数组，连接所有文件内容
      originalData = originalFile.map(file => fs.readFileSync(file, 'utf8')).join('\n');
    } else {
      // 单个文件
      originalData = fs.readFileSync(originalFile, 'utf8');
    }
    
    const tempData = fs.readFileSync(tempFile, 'utf8');
    
    // 检查必要节点
    const nodesToCheck = ['Root', 'Cabinet', 'Panels', 'Panel'];
    const result = {};
    
    nodesToCheck.forEach(node => {
      // 检查原始文件
      const originalRegex = new RegExp(`<${node}(\\s|>)`, 'i');
      const originalContainsNode = originalRegex.test(originalData);
      
      // 检查temp文件
      const tempRegex = new RegExp(`<${node}(\\s|>)`, 'i');
      const tempContainsNode = tempRegex.test(tempData);
      
      result[node] = {
        original: originalContainsNode,
        temp: tempContainsNode
      };
    });
    
    return result;
  } catch (error) {
    console.error('检查必要节点时出错:', error);
    return {};
  }
}

/**
 * 分析Cabinet节点差异
 * @param {string} originalFile - 原始优化文件路径
 * @param {string} tempFile - 生成的temp.xml文件路径
 * @returns {Object} 包含分析结果的对象
 */
function analyzeCabinetNodes(originalFile, tempFile) {
  try {
    // 读取文件内容
    let originalData = '';
    if (Array.isArray(originalFile)) {
      // 如果是数组，连接所有文件内容
      originalData = originalFile.map(file => fs.readFileSync(file, 'utf8')).join('\n');
    } else {
      // 单个文件
      originalData = fs.readFileSync(originalFile, 'utf8');
    }
    
    const tempData = fs.readFileSync(tempFile, 'utf8');
    
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
  } catch (error) {
    console.error('分析Cabinet节点时出错:', error);
    return {
      originalCabinetIds: [],
      tempCabinetIds: [],
      addedCabinetIds: [],
      lostCabinetIds: []
    };
  }
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
 * @param {string} [customerOutputDir] - 客户输出目录，如果提供则使用此目录查找temp.xml
 * @returns {Object|null} 包含检查结果的对象，如果出错则返回null
 */
function checkCustomerDataIntegrity(customerName, customerPaths, outputStream = console, customerOutputDir = null) {
  // 如果提供了客户输出目录，则使用该目录下的temp.xml文件
  let tempFile;
  let basePath;
  if (customerOutputDir) {
    tempFile = path.join(customerOutputDir, 'srcFiles', 'temp.xml');
    basePath = customerOutputDir;
  } else {
    basePath = path.join(__dirname, '..', 'local', customerName.replace('(F1产线)', '').replace('(N1产线)', ''));
    tempFile = path.join(basePath, 'srcFiles', 'temp.xml');
  }
  
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
    originalPanelCount, 
    tempPanelCount, 
    lostPanelIds, 
    integrity, 
    retentionRate 
  } = comparisonResult;
  
  // 检查必要节点
  const nodeCheckResult = checkRequiredNodes(originalFile, tempFile, excelFile);
  
  // 分析Cabinet节点
  const cabinetAnalysis = analyzeCabinetNodes(originalFile, tempFile);
  
  // 获取当前日期用于日志文件名
  const currentDate = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  
  // 输出结果
  outputStream.log(`\n===${currentDate} ${customerName} 数据检查 ===`);
  outputStream.log(`原始Panel节点数: ${formatNumberWithCommas(originalPanelCount)}`);
  outputStream.log(`TempPanel节点数: ${formatNumberWithCommas(tempPanelCount)}`);
  
  // 检查Excel文件是否存在
  if (excelFile && fs.existsSync(excelFile)) {
    outputStream.log(`Excel文件: ${path.basename(excelFile)}`);
  } else {
    outputStream.log(`Excel文件: 未找到`);
  }
  outputStream.log(`数据完整性: ${integrity ? '完整' : '不完整'}`);
  outputStream.log(`数据保留率: ${retentionRate.toFixed(2)}%`);
  
  // 如果有丢失的数据，记录日志
  if (lostPanelIds && lostPanelIds.length > 0) {
    outputStream.log(`\n=== 丢失的Panel数据 ===`);
    outputStream.log(`丢失Panel数量: ${lostPanelIds.length}`);
    outputStream.log(`丢失的Panel ID: ${lostPanelIds.join(', ')}`);
    
    // 记录到日志文件
    const logMessage = `客户"${customerName}"丢失${lostPanelIds.length}个Panel数据: ${lostPanelIds.join(', ')}`;
    // logWarning(customerName, 'DATA_INTEGRITY', logMessage);
  }
  
  outputStream.log(`\n=== 必要节点检查 ===`);
  Object.entries(nodeCheckResult).forEach(([node, { original, temp }]) => {
    // 检查Excel文件中是否包含该节点
    let excelContainsNode = false;
    if (excelFile && fs.existsSync(excelFile)) {
      try {
        const excelData = fs.readFileSync(excelFile, 'utf8');
        excelContainsNode = excelData.includes(node);
      } catch (error) {
        // 忽略Excel文件读取错误
      }
    }
    
    // 修改输出格式为新格式
    if (node === 'Panels' || node === 'Panel') {
      outputStream.log(`${node}节点: 原始节点：${original ? '包含' : '不包含'}, Temp节点：${temp ? '包含' : '不包含'}，表格数据的节点：${excelContainsNode ? '包含' : '不包含'}`);
    } else {
      outputStream.log(`${node}节点: 原始节点：${original ? '包含' : '不包含'}, Temp节点：${temp ? '包含' : '不包含'}，表格数据的节点：${excelContainsNode ? '包含' : '不包含'}`);
    }
  });
  
  // 分析Cabinet节点差异
  const originalCount = cabinetAnalysis.originalCabinetIds.length;
  const tempCount = cabinetAnalysis.tempCabinetIds.length;
  const hasDuplicateData = tempCount > originalCount;
  
  outputStream.log(`\nif多出了 节点，判断重复数据 ${hasDuplicateData}`);
  
  if (tempCount < originalCount) {
    outputStream.log(`\n少了节点 输出 缺失节点存放日志路径`);
    if (cabinetAnalysis.lostCabinetIds.length > 0) {
      outputStream.log(`缺失的Cabinet ID: ${cabinetAnalysis.lostCabinetIds.join(', ')}`);
      
      // 记录缺失节点的日志路径（按要求的格式）
      const logPath = path.join(__dirname, '..', '..', 'logs', `${currentDate}_${customerName}_缺失_Cabinet.log`);
      outputStream.log(`（${currentDate} ${customerName} 缺失 Cabinet。）`);
      outputStream.log(`缺失节点日志路径: ${logPath}`);
    }
  } else if (tempCount > originalCount) {
    outputStream.log(`\n多出了节点，说明是否重复数据 true`);
    if (cabinetAnalysis.addedCabinetIds.length > 0) {
      outputStream.log(`新增的Cabinet ID: ${cabinetAnalysis.addedCabinetIds.join(', ')}`);
    }
  } else {
    outputStream.log(`\n节点数量一致，数据完整`);
  }
  
  // 返回结果对象
  return {
    customerName,
    originalPanelCount,
    tempPanelCount,
    lostPanelIds,
    integrity,
    retentionRate,
    nodeCheckResult,
    cabinetAnalysis
  };
}

module.exports = {
  comparePanelCounts,
  checkRequiredNodes,
  analyzeCabinetNodes,
  formatNumberWithCommas,
  checkCustomerDataIntegrity
};