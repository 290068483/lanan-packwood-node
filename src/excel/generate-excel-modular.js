const { XMLParser } = require('fast-xml-parser');
const fs = require('fs');
const path = require('path');
const ExcelJS = require('exceljs');
const xml2js = require('xml2js');
const { DOMParser } = require('@xmldom/xmldom');
const crypto = require('crypto');

const {
  logError,
  logInfo,
  logWarning,
  logSuccess,
} = require('../utils/logger');

// 读取配置文件
const configPath = path.join(__dirname, '..', '..', 'config.json');

// 导入工具函数
const { generateExcel } = require('./excel-generator');
const {
  syncPackageAndData,
  checkPackageChanged,
} = require('../utils/data-sync');
const {
  incrementalSyncToNetwork,
  startNetworkMonitoring,
} = require('../network/network-sync');
const { checkCustomerDataIntegrity } = require('../utils/data-integrity-check');

// 配置XML解析器 - 标准配置
const standardParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  textNodeName: 'text',
  parseAttributeValue: true,
  parseTagValue: true,
  trimValues: true,
  // 添加更多容错配置
  allowBooleanAttributes: true,
  parseTrueNumberOnly: false,
  stopNodes: ['*'], // 跳过错误节点
});
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

// 配置XML解析器 - 宽松配置
const looseParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  textNodeName: 'text',
  parseAttributeValue: false, // 不强制解析属性值
  parseTagValue: false, // 不强制解析标签值
  trimValues: true,
  // 添加更多容错配置
  allowBooleanAttributes: true,
  parseTrueNumberOnly: false,
  stopNodes: ['*'], // 跳过错误节点
});

/**
 * 使用xml2js库解析XML数据
 * @param {string} xmlData - XML数据
 */
function parseXmlWithXml2js(xmlData) {
  return new Promise((resolve, reject) => {
    try {
      const xml2jsParser = new xml2js.Parser({
        explicitArray: false,
        ignoreAttrs: false,
        trim: true,
        explicitRoot: false,
        tagNameProcessors: [xml2js.processors.stripPrefix],
        attrNameProcessors: [xml2js.processors.stripPrefix],
        strict: false, // 使用宽松模式
      });

      xml2jsParser.parseString(xmlData, (err, result) => {
        if (err) {
          reject(err);
        } else {
          resolve(result);
        }
      });
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * 使用xmldom库解析XML数据
 * @param {string} xmlData - XML数据
 */
function parseXmlWithXmldom(xmlData) {
  try {
    const doc = new DOMParser().parseFromString(xmlData, 'text/xml');

    // 检查是否有解析错误
    const parserErrors = doc.getElementsByTagName('parsererror');
    if (parserErrors.length > 0) {
      throw new Error(`XML解析错误: ${parserErrors[0].textContent}`);
    }

    // 转换为JavaScript对象
    function nodeToObject(node) {
      const obj = {};

      // 处理属性
      if (node.attributes && node.attributes.length > 0) {
        obj['@_'] = {};
        for (let i = 0; i < node.attributes.length; i++) {
          const attr = node.attributes[i];
          obj['@_'][attr.name] = attr.value;
        }
      }

      // 处理子节点
      if (node.childNodes && node.childNodes.length > 0) {
        for (let i = 0; i < node.childNodes.length; i++) {
          const child = node.childNodes[i];
          if (child.nodeType === 1) {
            // 元素节点
            const childObj = nodeToObject(child);
            if (obj[child.nodeName]) {
              // 如果已经存在同名节点，转换为数组
              if (!Array.isArray(obj[child.nodeName])) {
                obj[child.nodeName] = [obj[child.nodeName]];
              }
              obj[child.nodeName].push(childObj);
            } else {
              obj[child.nodeName] = childObj;
            }
          } else if (child.nodeType === 3) {
            // 文本节点
            const text = child.textContent.trim();
            if (text) {
              obj['text'] = text;
            }
          }
        }
      }

      return obj;
    }

    // 从根节点开始转换
    const result = {};
    result[doc.documentElement.nodeName] = nodeToObject(doc.documentElement);
    return result;
  } catch (error) {
    throw new Error(`xmldom解析失败: ${error.message}`);
  }
}

/**
 * 尝试使用不同解析器解析XML数据
 * @param {string} xmlData - XML数据
 * @param {string} lineDir - 产线目录名
 * @param {string} customerName - 客户名称
 */
function parseXmlWithFallback(xmlData, lineDir, customerName) {
  // 首选方案：使用fast-xml-parser标准配置解析
  try {
    logInfo(customerName, lineDir, '尝试使用fast-xml-parser标准解析器解析XML');
    console.log(`  ✓ fast-xml-parser标准解析器解析成功 (${lineDir})`);
    const data = standardParser.parse(xmlData);
    return {
      success: true,
      data: data,
      parser: 'fast-xml-parser (standard)',
    };
  } catch (error) {
    logWarning(
      customerName,
      lineDir,
      `fast-xml-parser标准解析器解析失败 (${lineDir}): ${error.message}`
    );
    console.log(
      `  ⚠ fast-xml-parser标准解析器解析失败 (${lineDir}): ${error.message}`
    );

    // 备选方案1：使用宽松配置
    try {
      logInfo(
        customerName,
        lineDir,
        '尝试使用fast-xml-parser宽松解析器解析XML'
      );
      console.log(`  ✓ fast-xml-parser宽松解析器解析成功 (${lineDir})`);
      const data = looseParser.parse(xmlData);
      return {
        success: true,
        data: data,
        parser: 'fast-xml-parser (loose)',
      };
    } catch (looseError) {
      logWarning(
        customerName,
        lineDir,
        `fast-xml-parser宽松解析器解析失败 (${lineDir}): ${looseError.message}`
      );
      console.log(
        `  ⚠ fast-xml-parser宽松解析器解析失败 (${lineDir}): ${looseError.message}`
      );

      // 备选方案2：使用xml2js
      try {
        logInfo(customerName, lineDir, '尝试使用xml2js解析器解析XML');
        const data = parseXmlWithXml2js(xmlData);
        console.log(`  ✓ xml2js解析成功 (${lineDir})`);
        return { success: true, data: data, parser: 'xml2js' };
      } catch (xml2jsError) {
        logWarning(
          customerName,
          lineDir,
          `xml2js解析失败 (${lineDir}): ${xml2jsError.message}`
        );
        console.log(`  ⚠ xml2js解析失败 (${lineDir}): ${xml2jsError.message}`);

        // 备选方案3：使用xmldom
        try {
          logInfo(customerName, lineDir, '尝试使用xmldom解析器解析XML');
          const data = parseXmlWithXmldom(xmlData);
          console.log(`  ✓ xmldom解析成功 (${lineDir})`);
          return { success: true, data: data, parser: 'xmldom' };
        } catch (xmldomError) {
          logError(
            customerName,
            lineDir,
            `xmldom解析失败 (${lineDir}): ${xmldomError.message}`
          );
          console.log(
            `  ✗ xmldom解析失败 (${lineDir}): ${xmldomError.message}`
          );

          // 所有解析器都失败
          return { success: false, error: xmldomError.message };
        }
      }
    }
  }
}

/**
 * 使用正则表达式从XML数据中提取Panel节点
 * @param {string} xmlData - 原始XML数据
 * @returns {Array} - 提取到的Panel节点数组
 */
function extractPanelsWithRegex(xmlData) {
  const panels = [];
  try {
    // 使用正则表达式匹配Panel节点
    const panelRegex = /<Panel\s+([^>]+)>([\s\S]*?)<\/Panel>/g;
    let match;

    while ((match = panelRegex.exec(xmlData)) !== null) {
      const attributes = match[1];
      const content = match[2];

      // 解析属性
      const panel = {};
      const attrRegex = /(\w+)="([^"]*)"/g;
      let attrMatch;

      while ((attrMatch = attrRegex.exec(attributes)) !== null) {
        const attrName = attrMatch[1];
        const attrValue = attrMatch[2];
        panel[`@_${attrName}`] = attrValue;
      }

      panels.push(panel);
    }
  } catch (error) {
    console.error('使用正则表达式提取Panel节点时出错:', error.message);
  }

  return panels;
}

/**
 * 从整个数据结构中递归提取Panel节点
 * @param {Object} data - 解析后的数据对象
 * @returns {Array} - 提取到的Panel节点数组
 */
function extractPanelsFromData(data) {
  const panels = [];

  if (!data || typeof data !== 'object') {
    return panels;
  }

  // 递归查找Panel节点
  function traverse(obj) {
    if (!obj || typeof obj !== 'object') {
      return;
    }

    // 如果当前对象是Panel节点
    if (obj.Panel && typeof obj.Panel === 'object') {
      if (Array.isArray(obj.Panel)) {
        panels.push(...obj.Panel);
      } else {
        panels.push(obj.Panel);
      }
      return;
    }

    // 如果当前对象包含Panels节点
    if (obj.Panels && typeof obj.Panels === 'object') {
      if (obj.Panels.Panel) {
        if (Array.isArray(obj.Panels.Panel)) {
          panels.push(...obj.Panels.Panel);
        } else {
          panels.push(obj.Panels.Panel);
        }
        return;
      }
    }

    // 递归遍历所有属性
    for (const key in obj) {
      if (obj.hasOwnProperty(key) && typeof obj[key] === 'object') {
        traverse(obj[key]);
      }
    }
  }

  traverse(data);
  return panels;
}

/**
 * 处理客户数据
 * @param {string} customerDevicePath - 客户设备文件路径
 * @param {string} customerOutputDir - 客户输出目录
 * @param {string} customerName - 客户名称
 */
async function processCustomerData(
  customerDevicePath,
  customerOutputDir,
  customerName
) {
  try {
    // 获取所有产线目录（排除无效目录）
    const allDirs = fs.readdirSync(customerDevicePath);
    const productionLineDirs = allDirs.filter(
      dir =>
        dir !== '导入文件' &&
        dir !== '报表' &&
        fs.statSync(path.join(customerDevicePath, dir)).isDirectory()
    );

    if (productionLineDirs.length === 0) {
      console.warn(`⚠ 客户 "${customerName}" 没有找到有效的产线目录`);
      logWarning(customerName, 'DIRECTORY_CHECK', '没有找到有效的产线目录');
      return true;
    }

    // 收集所有产线数据
    const allCabinets = [];
    for (const lineDir of productionLineDirs) {
      const linePath = path.join(customerDevicePath, lineDir);

      // 支持多种XML文件名
      const possibleXmlFiles = [
        'temp.xml',
        '优化文件.xml',
        'NestingInputData.xml',
        'nesting_result.xml',
      ];

      let xmlFilePath = null;
      let xmlFileName = '';

      // 查找存在的XML文件
      for (const fileName of possibleXmlFiles) {
        const fullPath = path.join(linePath, fileName);
        if (fs.existsSync(fullPath)) {
          xmlFilePath = fullPath;
          xmlFileName = fileName;
          break;
        }

        // 检查特定子目录
        const subDirs = ['0、排版文件', '排版文件'];
        for (const subDir of subDirs) {
          const subPath = path.join(linePath, subDir, fileName);
          if (fs.existsSync(subPath)) {
            xmlFilePath = subPath;
            xmlFileName = `${subDir}/${fileName}`;
            break;
          }
        }

        if (xmlFilePath) break;
      }

      if (xmlFilePath) {
        try {
          const xmlData = fs.readFileSync(xmlFilePath, 'utf8');
          const result = parseXmlWithFallback(xmlData, lineDir, customerName);

          if (result.success) {
            // 添加调试信息，输出解析结果
            console.log(
              `ℹ [${customerName}] xml2js解析结果:`,
              result.data ? '有数据' : '无数据'
            );
            logInfo(
              customerName,
              lineDir,
              `xml2js解析结果: ${result.data ? '有数据' : '无数据'}`
            );

            if (result.data && result.data.Root) {
              // 添加调试信息，输出解析后的数据结构关键字段
              console.log(
                `ℹ [${customerName}] 解析后数据结构关键字段: ${Object.keys(result.data.Root).join(',')}`
              );

              // 处理不同的XML结构
              let cabinets = [];

              // 结构1: Root.Cabinets.Cabinet (旧结构)
              if (
                result.data.Root.Cabinets &&
                result.data.Root.Cabinets.Cabinet
              ) {
                cabinets = Array.isArray(result.data.Root.Cabinets.Cabinet)
                  ? result.data.Root.Cabinets.Cabinet
                  : [result.data.Root.Cabinets.Cabinet];
                console.log(
                  `✓ 已从产线 "${lineDir}" 的 ${xmlFileName} 文件中收集到 ${cabinets.length} 个Cabinet数据 (结构1)`
                );
                logInfo(
                  customerName,
                  lineDir,
                  `已从产线 "${lineDir}" 的 ${xmlFileName} 文件中收集到 ${cabinets.length} 个Cabinet数据 (结构1)`
                );
              }
              // 结构2: Root.Cabinet (新结构)
              else if (result.data.Root.Cabinet) {
                cabinets = Array.isArray(result.data.Root.Cabinet)
                  ? result.data.Root.Cabinet
                  : [result.data.Root.Cabinet];
                console.log(
                  `✓ 已从产线 "${lineDir}" 的 ${xmlFileName} 文件中收集到 ${cabinets.length} 个Cabinet数据 (结构2)`
                );
                logInfo(
                  customerName,
                  lineDir,
                  `已从产线 "${lineDir}" 的 ${xmlFileName} 文件中收集到 ${cabinets.length} 个Cabinet数据 (结构2)`
                );
              }
              // 结构3: Panel节点不在Cabinet内，直接在Root.Panels下
              else if (
                result.data.Root.Panels &&
                result.data.Root.Panels.Panel
              ) {
                // 创建一个虚拟的Cabinet来包含这些Panel
                const panels = Array.isArray(result.data.Root.Panels.Panel)
                  ? result.data.Root.Panels.Panel
                  : [result.data.Root.Panels.Panel];

                const virtualCabinet = {
                  '@_ID': 'virtual_cabinet',
                  '@_Name': 'Virtual Cabinet',
                  Panels: {
                    Panel: panels,
                  },
                };

                cabinets = [virtualCabinet];
                console.log(
                  `✓ 已从产线 "${lineDir}" 的 ${xmlFileName} 文件中收集到 ${panels.length} 个Panel数据 (结构3)`
                );
                logInfo(
                  customerName,
                  lineDir,
                  `已从产线 "${lineDir}" 的 ${xmlFileName} 文件中收集到 ${panels.length} 个Panel数据 (结构3)`
                );
              }
              // 结构4: Panel节点直接在Root下
              else if (result.data.Root.Panel) {
                // 创建一个虚拟的Cabinet来包含这些Panel
                const panels = Array.isArray(result.data.Root.Panel)
                  ? result.data.Root.Panel
                  : [result.data.Root.Panel];

                const virtualCabinet = {
                  '@_ID': 'virtual_cabinet',
                  '@_Name': 'Virtual Cabinet',
                  Panels: {
                    Panel: panels,
                  },
                };

                cabinets = [virtualCabinet];
                console.log(
                  `✓ 已从产线 "${lineDir}" 的 ${xmlFileName} 文件中收集到 ${panels.length} 个Panel数据 (结构4)`
                );
                logInfo(
                  customerName,
                  lineDir,
                  `已从产线 "${lineDir}" 的 ${xmlFileName} 文件中收集到 ${panels.length} 个Panel数据 (结构4)`
                );
              }
              // 新增结构5: 可能存在其他嵌套结构，直接尝试提取Panel节点
              else {
                // 尝试直接从整个数据结构中查找Panel节点
                const allPanels = extractPanelsFromData(result.data);
                if (allPanels.length > 0) {
                  const virtualCabinet = {
                    '@_ID': 'virtual_cabinet',
                    '@_Name': 'Virtual Cabinet',
                    Panels: {
                      Panel: allPanels,
                    },
                  };

                  cabinets = [virtualCabinet];
                  console.log(
                    `✓ 已从产线 "${lineDir}" 的 ${xmlFileName} 文件中收集到 ${allPanels.length} 个Panel数据 (结构5)`
                  );
                  logInfo(
                    customerName,
                    lineDir,
                    `已从产线 "${lineDir}" 的 ${xmlFileName} 文件中收集到 ${allPanels.length} 个Panel数据 (结构5)`
                  );
                } else {
                  // 最后的尝试：使用正则表达式直接从原始XML数据中提取Panel节点
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
                    console.log(
                      `✓ 已从产线 "${lineDir}" 的 ${xmlFileName} 文件中收集到 ${regexPanels.length} 个Panel数据 (结构6-正则表达式)`
                    );
                    logInfo(
                      customerName,
                      lineDir,
                      `已从产线 "${lineDir}" 的 ${xmlFileName} 文件中收集到 ${regexPanels.length} 个Panel数据 (结构6-正则表达式)`
                    );
                  } else {
                    console.log(
                      `⚠ 产线 "${lineDir}" 的 ${xmlFileName} 文件中未找到有效的Panel数据`
                    );
                    logWarning(
                      customerName,
                      lineDir,
                      `产线 "${lineDir}" 的 ${xmlFileName} 文件中未找到有效的Panel数据`
                    );
                  }
                }
              }

              if (cabinets.length > 0) {
                cabinets.forEach(cabinet => {
                  cabinet.lineDir = lineDir; // 添加产线目录信息
                });

                allCabinets.push(...cabinets);
                console.log(
                  `✓ 已从产线 "${lineDir}" 的 ${xmlFileName} 文件中收集到 ${cabinets.length} 个Cabinet数据`
                );
                logInfo(
                  customerName,
                  lineDir,
                  `已从产线 "${lineDir}" 的 ${xmlFileName} 文件中收集到 ${cabinets.length} 个Cabinet数据`
                );
              }
            } else {
              console.log(
                `⚠ 产线 "${lineDir}" 的 ${xmlFileName} 文件解析后没有Root节点`
              );
              logWarning(
                customerName,
                lineDir,
                `产线 "${lineDir}" 的 ${xmlFileName} 文件解析后没有Root节点`
              );

              // 即使没有Root节点，也尝试使用正则表达式提取Panel节点
              const regexPanels = extractPanelsWithRegex(xmlData);
              if (regexPanels.length > 0) {
                const virtualCabinet = {
                  '@_ID': 'virtual_cabinet',
                  '@_Name': 'Virtual Cabinet',
                  Panels: {
                    Panel: regexPanels,
                  },
                };

                const cabinets = [virtualCabinet];
                cabinets.forEach(cabinet => {
                  cabinet.lineDir = lineDir; // 添加产线目录信息
                });

                allCabinets.push(...cabinets);
                console.log(
                  `✓ 已从产线 "${lineDir}" 的 ${xmlFileName} 文件中收集到 ${regexPanels.length} 个Panel数据 (结构7-纯正则表达式)`
                );
                logInfo(
                  customerName,
                  lineDir,
                  `已从产线 "${lineDir}" 的 ${xmlFileName} 文件中收集到 ${regexPanels.length} 个Panel数据 (结构7-纯正则表达式)`
                );
              }
            }
          }
        } catch (error) {
          console.error(
            `✗ 读取产线 "${lineDir}" 的XML文件时出错:`,
            error.message
          );
          logError(
            customerName,
            'DATA_COLLECTION',
            `读取产线 "${lineDir}" 的XML文件时出错: ${error.message}`,
            error.stack
          );
        }
      } else {
        console.warn(`⚠ 产线 "${lineDir}" 中未找到XML文件`);
        logWarning(
          customerName,
          'DATA_COLLECTION',
          `产线 "${lineDir}" 中未找到XML文件`
        );
      }
    }

    console.log(
      `✓ 客户 "${customerName}" 总共收集到 ${allCabinets.length} 个Cabinet数据`
    );
    logInfo(
      customerName,
      'MAIN',
      `总共收集到 ${allCabinets.length} 个Cabinet数据`
    );

    // 同步检查数据和package.json是否发生变化
    const { dataChanged, packageChanged } = await syncPackageAndData(
      allCabinets,
      customerOutputDir,
      customerName
    );

    if (!dataChanged) {
      console.log(`ℹ 客户 "${customerName}" 数据未发生变化，跳过生成文件`);
      logInfo(customerName, 'MAIN', '数据未发生变化，跳过生成文件');

      // 即使数据未变化，也生成temp.xml文件用于数据完整性检查
      try {
        // 确保输出目录存在
        if (!fs.existsSync(customerOutputDir)) {
          fs.mkdirSync(customerOutputDir, { recursive: true });
        }

        // 创建XML构建器
        const { XMLBuilder } = require('fast-xml-parser');
        const builder = new XMLBuilder({
          ignoreAttributes: false,
          attributeNamePrefix: '@_',
          textNodeName: 'text',
          suppressEmptyNode: true,
          format: true,
          indentBy: '  ',
        });

        // 构建xml数据结构
        const simplifiedData = {
          Root: {},
        };

        // 添加 Cabinet 数据
        if (allCabinets.length > 0) {
          if (allCabinets.length === 1) {
            // 单个 Cabinet
            simplifiedData.Root.Cabinet = allCabinets[0];
          } else {
            // 多个 Cabinet
            simplifiedData.Root.Cabinets = {
              Cabinet: allCabinets,
            };
          }
        }

        // 构建XML
        let simplifiedXml = builder.build(simplifiedData);

        // 如果构建失败，尝试使用xml2js
        if (!simplifiedXml) {
          const xml2js = require('xml2js');
          const builder2 = new xml2js.Builder({
            headless: true,
            renderOpts: {
              pretty: true,
              indent: '  ',
            },
          });
          simplifiedXml = builder2.buildObject(simplifiedData);
        }

        // 生成输出文件名
        const simplifiedXmlPath = path.join(customerOutputDir, 'temp.xml');

        // 保存为XML文件
        if (simplifiedXml) {
          fs.writeFileSync(simplifiedXmlPath, simplifiedXml, 'utf8');
          console.log(`✓ XML文件已生成到 ${simplifiedXmlPath}`);
          logSuccess(
            customerName,
            'XML_GENERATION',
            `XML文件已生成到 ${simplifiedXmlPath}`
          );
        } else {
          console.warn('⚠ 无法生成XML文件');
          logWarning(customerName, 'XML_GENERATION', '无法生成 XML文件');
        }
      } catch (error) {
        console.warn('⚠ 生成XML文件时出错:', error.message);
        logWarning(
          customerName,
          'XML_GENERATION',
          `生成 XML文件时出错: ${error.message}`,
          error.stack
        );
      }

      // 即使数据未变化，也执行增量同步
      try {
        const syncResult = await incrementalSyncToNetwork(
          customerName,
          customerOutputDir
        );
        if (syncResult.success) {
          console.log(`✓ 客户 "${customerName}" 增量同步成功`);
          logSuccess(customerName, 'NETWORK_SYNC', '增量同步成功');
        } else {
          console.log(
            `⚠ 客户 "${customerName}" 增量同步失败: ${syncResult.message}`
          );
          logWarning(
            customerName,
            'NETWORK_SYNC',
            `增量同步失败: ${syncResult.message}`
          );
        }
      } catch (syncError) {
        console.error(
          `✗ 客户 "${customerName}" 增量同步异常: ${syncError.message}`
        );
        logError(
          customerName,
          'NETWORK_SYNC',
          `增量同步异常: ${syncError.message}`
        );
      }

      return true;
    }

    // 生成 XML文件
    try {
      // 确保输出目录存在
      if (!fs.existsSync(customerOutputDir)) {
        fs.mkdirSync(customerOutputDir, { recursive: true });
      }

      // 创建XML构建器
      const { XMLBuilder } = require('fast-xml-parser');
      const builder = new XMLBuilder({
        ignoreAttributes: false,
        attributeNamePrefix: '@_',
        textNodeName: 'text',
        suppressEmptyNode: true,
        format: true,
        indentBy: '  ',
      });

      // 构建 数据结构
      const simplifiedData = {
        Root: {},
      };

      // 添加 Cabinet 数据
      if (allCabinets.length > 0) {
        if (allCabinets.length === 1) {
          // 单个 Cabinet
          simplifiedData.Root.Cabinet = allCabinets[0];
        } else {
          // 多个 Cabinet
          simplifiedData.Root.Cabinets = {
            Cabinet: allCabinets,
          };
        }
      }

      // 构建XML
      let simplifiedXml = builder.build(simplifiedData);

      // 如果构建失败，尝试使用xml2js
      if (!simplifiedXml) {
        const xml2js = require('xml2js');
        const builder2 = new xml2js.Builder({
          headless: true,
          renderOpts: {
            pretty: true,
            indent: '  ',
          },
        });
        simplifiedXml = builder2.buildObject(simplifiedData);
      }

      // 生成输出文件名
      const simplifiedXmlPath = path.join(customerOutputDir, 'temp.xml');

      // 保存为XML文件
      if (simplifiedXml) {
        fs.writeFileSync(simplifiedXmlPath, simplifiedXml, 'utf8');
        console.log(`✓  XML文件已生成到 ${simplifiedXmlPath}`);
        logSuccess(
          customerName,
          'XML_GENERATION',
          ` XML文件已生成到 ${simplifiedXmlPath}`
        );
      } else {
        console.warn('⚠ 无法生成 XML文件');
        logWarning(customerName, 'XML_GENERATION', '无法生成 XML文件');
      }
    } catch (error) {
      console.warn('⚠ 生成 XML文件时出错:', error.message);
      logWarning(
        customerName,
        'XML_GENERATION',
        `生成 XML文件时出错: ${error.message}`,
        error.stack
      );
    }

    // 生成Excel文件
    try {
      const result = await generateExcel(
        allCabinets,
        customerName,
        customerOutputDir,
        packageChanged
      );

      if (result && result.success) {
        console.log('✓ Excel文件生成成功');
        logSuccess(customerName, 'EXCEL_GENERATION', 'Excel文件生成成功');

        // 检查数据完整性
        await checkDataIntegrityAfterProcessing(customerName, config);

        // 调用网络同步功能
        if (config.enableNetworkSync) {
          try {
            const syncResult = await incrementalSyncToNetwork(
              {
                outputDir: customerOutputDir,
                customerName,
                packagedRows: result.packagedRows,
                totalRows: result.totalRows,
              },
              config
            );

            if (!syncResult.success) {
              console.warn('⚠ 网络同步失败:', syncResult.message);
              logWarning(
                customerName,
                'NETWORK_SYNC',
                `网络同步失败: ${syncResult.message}`
              );
            }
          } catch (syncError) {
            console.warn('⚠ 网络同步异常:', syncError.message);
            logWarning(
              customerName,
              'NETWORK_SYNC',
              `网络同步异常: ${syncError.message}`
            );
          }
        }

        return true;
      } else {
        console.error('✗ Excel文件生成失败');
        logError(customerName, 'EXCEL_GENERATION', 'Excel文件生成失败');
        return false;
      }
    } catch (error) {
      console.error('✗ 生成Excel文件时出错:', error.message);
      logError(
        customerName,
        'EXCEL_GENERATION',
        `生成Excel文件时出错: ${error.message}`,
        error.stack
      );
      return false;
    }
  } catch (error) {
    console.error(
      `✗ 处理客户 "${customerName}" 数据时发生错误:`,
      error.message
    );
    logError(
      customerName,
      'MAIN',
      `处理客户数据时发生错误: ${error.message}`,
      error.stack
    );
    return false;
  }
}

/**
 * 在处理完成后检查数据完整性
 * @param {string} customerName - 客户名称
 * @param {Object} config - 配置对象
 */
async function checkDataIntegrityAfterProcessing(customerName, config) {
  try {
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

    // 检查数据完整性
    const result = checkCustomerDataIntegrity(
      customerName,
      customerPaths,
      console
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
      .filter(dir =>
        fs.statSync(path.join(config.sourcePath, dir)).isDirectory()
      );

    if (customerDirs.length === 0) {
      console.warn('⚠ 未找到任何客户目录');
      process.exit(0);
    }

    let successCount = 0;
    // 处理每个客户
    for (const customerDir of customerDirs) {
      console.log(`\n📋 正在处理客户: ${customerDir}`);

      // 为客户创建输出目录
      const customerOutputDir = path.join(config.localPath, customerDir);
      fs.mkdirSync(customerOutputDir, { recursive: true });

      // 处理客户数据
      const success = await processCustomerData(
        path.join(config.sourcePath, customerDir, '设备文件'),
        customerOutputDir,
        customerDir
      );

      if (success) {
        successCount++;
        console.log(`✓ 客户 "${customerDir}" 处理成功`);
      } else {
        console.error(`✗ 客户 "${customerDir}" 处理失败`);
        logError(customerDir, 'MAIN', '客户处理失败');
      }
    }

    console.log(
      `\n🎉 处理完成，共处理了 ${customerDirs.length} 个客户，成功 ${successCount} 个`
    );
  } catch (error) {
    console.error('✗ 程序执行过程中发生错误:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// 如果直接运行此脚本，则执行主函数
if (require.main === module) {
  main();
}

module.exports = { processCustomerData, main };
