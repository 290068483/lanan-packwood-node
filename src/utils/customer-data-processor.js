const fs = require('fs');
const path = require('path');

const { logInfo, logError, logWarning } = require('./logger');
const {
  parseXmlWithFallback,
  extractPanelsWithRegex,
} = require('./xml-parser');
const { generateTempXml } = require('./temp-xml-generator');
const { syncPackageAndData } = require('./data-sync');
const { generateExcel } = require('../excel/excel-generator');
const { incrementalSyncToNetwork } = require('../network/network-sync');

/**
 * 从整个数据结构中递归提取Panel节点
 * @param {Object} data - 解析后的数据对象
 * @returns {Array} - 提取到的Panel节点数组
 */
function extractPanelsFromData(data) {
  const panels = [];

  function traverse(obj) {
    if (obj && typeof obj === 'object') {
      if (Array.isArray(obj)) {
        obj.forEach(item => traverse(item));
      } else {
        // 检查是否是Panel节点 (具有 @_ID 属性的对象)
        if (obj['@_'] && obj['@_'].ID !== undefined) {
          panels.push(obj);
        }
        
        // 同时检查直接具有 @_ID 属性的对象（兼容不同解析器的结果）
        if (obj['@_ID'] !== undefined) {
          panels.push(obj);
        }

        // 递归遍历所有属性
        Object.keys(obj).forEach(key => {
          if (key !== '@_') {
            traverse(obj[key]);
          }
        });
      }
    }
  }

  traverse(data);
  return panels;
}

/**
 * 保护性复制Panel对象，确保不丢失任何属性
 * @param {Object} panel - 原始Panel对象
 * @returns {Object} 复制后的Panel对象
 */
function preservePanelData(panel) {
  // 深度复制Panel对象以防止修改原始数据
  try {
    return JSON.parse(JSON.stringify(panel));
  } catch (error) {
    // 如果无法序列化，返回原始对象
    console.warn('⚠ 无法深度复制Panel对象，使用原始对象');
    return panel;
  }
}

/**
 * 处理单个产线的数据
 * @param {string} linePath - 产线路径
 * @param {string} customerOutputDir - 客户输出目录
 * @param {string} customerName - 客户名称
 * @param {string} lineDir - 产线目录名
 * @param {Object} config - 配置对象
 * @returns {Promise<boolean>} 处理是否成功
 */
async function processLineData(
  linePath,
  customerOutputDir,
  customerName,
  lineDir,
  config
) {
  try {
    console.log(`  📁 正在处理产线: ${lineDir}`);
    logInfo(customerName, lineDir, '开始处理产线数据');

    // 查找XML文件
    const xmlFiles = fs
      .readdirSync(linePath)
      .filter(file => path.extname(file) === '.xml');
    if (xmlFiles.length === 0) {
      console.log(`  ⚠ 产线目录中未找到XML文件: ${lineDir}`);
      logWarning(customerName, lineDir, '产线目录中未找到XML文件');
      return false;
    }

    const xmlFile = xmlFiles[0]; // 假设只有一个XML文件
    const xmlFilePath = path.join(linePath, xmlFile);
    const xmlData = fs.readFileSync(xmlFilePath, 'utf8');

    // 尝试解析XML数据
    const parseResult = parseXmlWithFallback(xmlData, lineDir, customerName);
    if (!parseResult.success) {
      console.log(`  ✗ 解析XML文件失败: ${lineDir}`);
      logError(customerName, lineDir, `解析XML文件失败: ${parseResult.error}`);
      return false;
    }

    console.log(`  📊 使用${parseResult.parser}解析器解析成功`);
    logInfo(customerName, lineDir, `使用${parseResult.parser}解析器解析成功`);

    // 提取Panel节点
    let panels = extractPanelsFromData(parseResult.data);

    // 如果没有提取到Panel，尝试使用正则表达式
    if (panels.length === 0) {
      console.log('  ⚠ 未通过解析器提取到Panel，尝试使用正则表达式提取');
      logWarning(
        customerName,
        lineDir,
        '未通过解析器提取到Panel，尝试使用正则表达式提取'
      );
      panels = extractPanelsWithRegex(xmlData);
    }

    console.log(`  📦 提取到 ${panels.length} 个Panel节点`);
    logInfo(customerName, lineDir, `提取到 ${panels.length} 个Panel节点`);

    if (panels.length === 0) {
      console.log(`  ⚠ 未找到任何Panel节点: ${lineDir}`);
      logWarning(customerName, lineDir, '未找到任何Panel节点');
      return false;
    }

    // 创建srcFiles目录
    const srcFilesDir = path.join(customerOutputDir, 'srcFiles');
    if (!fs.existsSync(srcFilesDir)) {
      fs.mkdirSync(srcFilesDir, { recursive: true });
    }
    
    // 保护性复制Panel数据，确保不丢失任何信息
    const preservedPanels = panels.map(panel => preservePanelData(panel));
    
    // 生成temp.xml文件到srcFiles目录
    const tempXmlPath = path.join(srcFilesDir, 'temp.xml');
    generateTempXml(preservedPanels, tempXmlPath, customerName, lineDir);

    // 读取并处理包裹数据
    const packageResult = await syncPackageAndData(
      preservedPanels,
      customerOutputDir,
      customerName
    );

    if (!packageResult.success) {
      console.log(`  ✗ 处理包裹数据失败: ${lineDir}`);
      logError(
        customerName,
        lineDir,
        `处理包裹数据失败: ${packageResult.message}`
      );
      return false;
    }

    // 构建虚拟 Cabinet 结构以匹配 Excel 生成器期望的格式
    const virtualCabinet = {
      '@_ID': '1',
      '@_Name': 'Cabinet1',
      '@_GroupName': 'Virtual Cabinet',
      Panels: {
        Panel: preservedPanels
      }
    };

    // 生成Excel文件
    const excelResult = await generateExcel(
      [virtualCabinet], // Cabinet数据数组
      customerName,
      customerOutputDir,
      packageResult.packageChanged
    );

    if (!excelResult.success) {
      console.log(`  ✗ 生成Excel文件失败: ${lineDir}`);
      logError(
        customerName,
        lineDir,
        `生成Excel文件失败: ${excelResult.message}`
      );
      return false;
    }

    console.log(
      `  ✅ 产线处理完成: ${lineDir} (${excelResult.totalRows} 行数据)`
    );
    logInfo(
      customerName,
      lineDir,
      `产线处理完成 (${excelResult.totalRows} 行数据)`
    );

    // 网络同步
    if (config.enableNetworkSync) {
      const syncResult = await incrementalSyncToNetwork(
        {
          outputDir: customerOutputDir,
          customerName: customerName,
          packagedRows: packageResult.packagedRows,
          totalRows: excelResult.totalRows,
        },
        config
      );

      if (syncResult.success) {
        console.log(`  ☁️ 网络同步成功: ${lineDir}`);
        logInfo(customerName, lineDir, '网络同步成功');
      } else {
        console.log(`  ⚠ 网络同步失败: ${lineDir} (${syncResult.message})`);
        logWarning(
          customerName,
          lineDir,
          `网络同步失败: ${syncResult.message}`
        );
      }
    } else {
      console.log(`  🚫 网络同步已禁用: ${lineDir}`);
      logInfo(customerName, lineDir, '网络同步已禁用');
    }

    return true;
  } catch (error) {
    console.log(`  ✗ 处理产线数据时出错: ${lineDir} (${error.message})`);
    logError(
      customerName,
      lineDir,
      `处理产线数据时出错: ${error.message}`,
      error.stack
    );
    return false;
  }
}

/**
 * 处理客户数据
 * @param {string} customerSourcePath - 客户源路径
 * @param {string} customerOutputDir - 客户输出目录
 * @param {string} customerName - 客户名称
 * @param {Object} config - 配置对象
 * @returns {Promise<boolean>} 处理是否成功
 */
async function processCustomerData(
  customerSourcePath,
  customerOutputDir,
  customerName,
  config
) {
  try {
    console.log(`📁 正在处理客户路径: ${customerSourcePath}`);
    logInfo(customerName, 'PROCESS', '开始处理客户数据');

    // 检查设备文件目录 (支持两种可能的路径结构)
    let deviceDir = path.join(customerSourcePath, 'N1产线', '0、排版文件');
    if (!fs.existsSync(deviceDir)) {
      // 尝试另一种路径结构
      deviceDir = path.join(customerSourcePath, '设备文件', 'N1产线', '0、排版文件');
    }
    
    if (!fs.existsSync(deviceDir)) {
      console.log(`⚠ 未找到设备文件目录: ${customerName}`);
      logWarning(customerName, 'PROCESS', '未找到设备文件目录');
      return false;
    }

    // 查找产线目录
    const lineDirs = fs
      .readdirSync(deviceDir)
      .filter(dir => fs.statSync(path.join(deviceDir, dir)).isDirectory());

    if (lineDirs.length === 0) {
      console.log(`⚠ 未找到任何产线目录: ${customerName}`);
      logWarning(customerName, 'PROCESS', '未找到任何产线目录');
      return false;
    }

    let lineSuccessCount = 0;
    // 处理每个产线
    for (const lineDir of lineDirs) {
      const linePath = path.join(deviceDir, lineDir);
      const success = await processLineData(
        linePath,
        customerOutputDir,
        customerName,
        lineDir,
        config
      );

      if (success) {
        lineSuccessCount++;
      }
    }

    console.log(
      `✅ 客户处理完成: ${customerName} (${lineSuccessCount}/${lineDirs.length} 产线成功)`
    );
    logInfo(
      customerName,
      'PROCESS',
      `客户处理完成 (${lineSuccessCount}/${lineDirs.length} 产线成功)`
    );

    return lineSuccessCount > 0;
  } catch (error) {
    console.log(`✗ 处理客户数据时出错: ${customerName} (${error.message})`);
    logError(
      customerName,
      'PROCESS',
      `处理客户数据时出错: ${error.message}`,
      error.stack
    );
    return false;
  }
}

module.exports = {
  processCustomerData,
};