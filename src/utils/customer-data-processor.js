const fs = require('fs');
const path = require('path');

const { logInfo, logError, logWarning, logSuccess } = require('./logger');
const {
  parseXmlWithFallback,
  extractPanelsWithRegex,
} = require('./xml-parser');
const { generateTempXml } = require('./xml-generator');
const { syncPackageAndData } = require('./data-sync');
const { generateExcel } = require('../excel/excel-generator-enhanced');
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

        // 检查是否是Panel节点（通过节点名称判断）
        if (obj['@_'] && obj['@_'].name && obj['@_'].name.includes('Panel')) {
          panels.push(obj);
        }

        // 检查是否是Panel节点（通过其他常见属性判断）
        if (obj['@_'] && (obj['@_'].width || obj['@_'].height || obj['@_'].thickness)) {
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
 * 删除XML数据中不需要的标签结构
 * @param {Object} data - XML解析后的数据对象
 * @returns {Object} 清理后的数据对象
 */
function removeUnnecessaryTags(data) {
  // 深度复制数据以避免修改原始数据
  const cleanedData = JSON.parse(JSON.stringify(data));

  // 递归遍历并删除不需要的标签
  function traverse(obj) {
    if (obj && typeof obj === 'object') {
      if (Array.isArray(obj)) {
        obj.forEach(item => traverse(item));
      } else {
        // 删除不需要的属性（示例：删除一些冗余或无用的属性）
        // 可以根据实际需求添加更多要删除的标签
        const unnecessaryKeys = [
          // 在这里添加不需要的标签键名
          // 例如: 'UnnecessaryTag', 'TemporaryData', etc.
        ];

        unnecessaryKeys.forEach(key => {
          if (obj.hasOwnProperty(key)) {
            delete obj[key];
          }
        });

        // 递归处理所有子对象
        Object.keys(obj).forEach(key => {
          traverse(obj[key]);
        });
      }
    }
  }

  traverse(cleanedData);
  return cleanedData;
}

/**
 * 保存解析后的XML数据到文件
 * @param {Object} data - 解析后的数据对象
 * @param {string} outputPath - 输出文件路径
 */
function saveParsedXmlData(data, outputPath) {
  try {
    // 确保输出目录存在
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // 将数据保存为JSON格式（便于调试和后续处理）
    fs.writeFileSync(outputPath, JSON.stringify(data, null, 2), 'utf8');
    console.log(`✓ 解析后的XML数据已保存到: ${outputPath}`);
    logSuccess('SYSTEM', 'DATA_SAVE', `解析后的XML数据已保存到: ${outputPath}`);
  } catch (error) {
    console.error(`✗ 保存解析后的XML数据失败: ${error.message}`);
    logError('SYSTEM', 'DATA_SAVE', `保存解析后的XML数据失败: ${error.message}`, error.stack);
  }
}

/**
 * 处理单个产线的数据（优化版）
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

    // 保存解析后的原始数据（优化步骤1：先保存解析数据）
    const parsedDataDir = path.join(customerOutputDir, 'parsedData');
    const parsedDataPath = path.join(parsedDataDir, `parsed_${xmlFile.replace('.xml', '.json')}`);
    saveParsedXmlData(parseResult.data, parsedDataPath);

    // 删除不需要的标签结构
    const cleanedData = removeUnnecessaryTags(parseResult.data);

    // 保存清理后的数据
    const cleanedDataPath = path.join(parsedDataDir, `cleaned_${xmlFile.replace('.xml', '.json')}`);
    saveParsedXmlData(cleanedData, cleanedDataPath);

    // 处理不同的XML结构，提取Cabinet信息
    let cabinets = [];

    // 结构1: Root.Cabinets.Cabinet (旧结构)
    if (
      cleanedData.Root.Cabinets &&
      cleanedData.Root.Cabinets.Cabinet
    ) {
      cabinets = Array.isArray(cleanedData.Root.Cabinets.Cabinet)
        ? cleanedData.Root.Cabinets.Cabinet
        : [cleanedData.Root.Cabinets.Cabinet];
      console.log(`  📦 提取到 ${cabinets.length} 个Cabinet数据 (结构1)`);
    }
    // 结构2: Root.Cabinet (新结构)
    else if (cleanedData.Root.Cabinet) {
      cabinets = Array.isArray(cleanedData.Root.Cabinet)
        ? cleanedData.Root.Cabinet
        : [cleanedData.Root.Cabinet];
      console.log(`  📦 提取到 ${cabinets.length} 个Cabinet数据 (结构2)`);
    }
    // 结构3: Panel节点不在Cabinet内，直接在Root.Panels下
    else if (
      cleanedData.Root.Panels &&
      cleanedData.Root.Panels.Panel
    ) {
      // 创建一个虚拟的Cabinet来包含这些Panel
      const panels = Array.isArray(cleanedData.Root.Panels.Panel)
        ? cleanedData.Root.Panels.Panel
        : [cleanedData.Root.Panels.Panel];

      const virtualCabinet = {
        '@_ID': 'virtual_cabinet',
        '@_Name': 'Virtual Cabinet',
        Panels: {
          Panel: panels,
        },
      };

      cabinets = [virtualCabinet];
      console.log(`  📦 提取到 ${panels.length} 个Panel数据 (结构3)`);
    }
    // 结构4: Panel节点直接在Root下
    else if (cleanedData.Root.Panel) {
      // 创建一个虚拟的Cabinet来包含这些Panel
      const panels = Array.isArray(cleanedData.Root.Panel)
        ? cleanedData.Root.Panel
        : [cleanedData.Root.Panel];

      const virtualCabinet = {
        '@_ID': 'virtual_cabinet',
        '@_Name': 'Virtual Cabinet',
        Panels: {
          Panel: panels,
        },
      };

      cabinets = [virtualCabinet];
      console.log(`  📦 提取到 ${panels.length} 个Panel数据 (结构4)`);
    }
    // 其他结构：尝试直接提取Panel节点
    else {
      const panels = extractPanelsFromData(cleanedData);
      if (panels.length === 0) {
        // 尝试使用正则表达式
        const regexPanels = extractPanelsWithRegex(xmlData);
        if (regexPanels.length > 0) {
          const virtualCabinet = {
            '@_ID': 'virtual_cabinet',
            '@_Name': 'Virtual Cabinet',
            Panels: {
              Panel: regexPanels,
            },
          };
          cabinets = [virtualCabinet];
          console.log(`  📦 提取到 ${regexPanels.length} 个Panel数据 (正则表达式)`);
        }
      } else {
        const virtualCabinet = {
          '@_ID': 'virtual_cabinet',
          '@_Name': 'Virtual Cabinet',
          Panels: {
            Panel: panels,
          },
        };
        cabinets = [virtualCabinet];
        console.log(`  📦 提取到 ${panels.length} 个Panel数据 (直接提取)`);
      }
    }

    if (cabinets.length === 0) {
      console.log(`  ⚠ 未找到任何Cabinet或Panel节点: ${lineDir}`);
      logWarning(customerName, lineDir, '未找到任何Cabinet或Panel节点');
      return false;
    }

    // 创建srcFiles目录
    const srcFilesDir = path.join(customerOutputDir, 'srcFiles');
    if (!fs.existsSync(srcFilesDir)) {
      fs.mkdirSync(srcFilesDir, { recursive: true });
    }

    // 从所有Cabinet中提取所有Panel数据
    const allPanels = [];
    cabinets.forEach(cabinet => {
      if (cabinet.Panels && cabinet.Panels.Panel) {
        if (Array.isArray(cabinet.Panels.Panel)) {
          allPanels.push(...cabinet.Panels.Panel);
        } else {
          allPanels.push(cabinet.Panels.Panel);
        }
      }
    });

    // 保护性复制Panel数据，确保不丢失任何信息
    const preservedPanels = allPanels.map(panel => preservePanelData(panel));

    // 第一步：生成XML文件到srcFiles目录（使用配置中的文件名格式）
    console.log(`  📝 正在生成XML文件...`);
    let xmlFileName = config.outputXmlName || 'temp.xml';
    console.log(`DEBUG: 配置中的outputXmlName: ${config.outputXmlName}`);
    console.log(`DEBUG: 替换前的xmlFileName: ${xmlFileName}`);
    // 替换占位符为实际的客户名称，并去除#符号
    xmlFileName = xmlFileName.replace(/{customerName}/g, customerName);
    // 去除XML文件名中的#符号
    xmlFileName = xmlFileName.replace('#', '');
    console.log(`DEBUG: 替换后的xmlFileName: ${xmlFileName}`);
    const tempXmlFilePath = path.join(srcFilesDir, xmlFileName);
    console.log(`DEBUG: 最终的tempXmlFilePath: ${tempXmlFilePath}`);
    // 传递原始的Cabinet数据给generateTempXml，确保能正确创建多个<cabinets>标签
    const xmlGenerationResult = generateTempXml(preservedPanels, tempXmlFilePath, customerName, lineDir, cabinets);

    // 验证XML文件是否生成成功
    if (!xmlGenerationResult) {
      console.log(`  ✗ XML文件生成失败: ${lineDir}`);
      logError(customerName, lineDir, 'XML文件生成失败');
      return false;
    }

    console.log(`  ✓ XML文件已成功生成: ${xmlGenerationResult}`);

    // 第二步：读取并处理包裹数据
    console.log(`  📦 正在处理包裹数据...`);
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

    // 第三步：生成Excel文件，使用完整的cabinets数组
    console.log(`  📊 正在生成Excel文件...`);
    const excelResult = await generateExcel(
      cabinets, // 完整的Cabinet数据数组
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