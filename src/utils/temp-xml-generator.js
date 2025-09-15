const fs = require('fs');
const path = require('path');
const { logSuccess, logWarning, logError } = require('./logger');

/**
 * 生成符合temp-pack目录中XML格式的temp.xml文件
 * @param {Array} allCabinets - Cabinet数据数组
 * @param {string} customerOutputDir - 客户输出目录
 * @param {string} customerName - 客户名称
 */
async function generateTempXml(allCabinets, customerOutputDir, customerName) {
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
      textNodeName: '#text',
      suppressEmptyNode: true,
      format: true,
      indentBy: '  ',
      encoding: 'utf-8'
    });

    // 构建符合temp-pack目录中XML格式的数据结构
    const simplifiedData = {
      '?xml': {
        '@_version': '1.0',
        '@_encoding': 'utf-8'
      },
      Root: {
        Cabinet: allCabinets
      }
    };

    // 构建XML
    let simplifiedXml = builder.build(simplifiedData);
    
    // 如果构建失败，尝试使用xml2js
    if (!simplifiedXml) {
      const xml2js = require('xml2js');
      const builder2 = new xml2js.Builder({
        headless: false,
        renderOpts: {
          pretty: true,
          indent: '  '
        },
        xmldec: {
          version: '1.0',
          encoding: 'utf-8'
        }
      });
      simplifiedXml = builder2.buildObject(simplifiedData);
    }

    // 只在srcFiles目录中生成temp.xml文件
    const srcFilesDir = path.join(customerOutputDir, 'srcFiles');
    // 确保srcFiles目录存在
    if (!fs.existsSync(srcFilesDir)) {
      fs.mkdirSync(srcFilesDir, { recursive: true });
    }
    const simplifiedXmlPath = path.join(srcFilesDir, 'temp.xml');
    
    // 保存为XML文件
    if (simplifiedXml) {
      fs.writeFileSync(simplifiedXmlPath, simplifiedXml, 'utf8');
      console.log(`✓ 简化版XML文件已生成到 ${simplifiedXmlPath}`);
      logSuccess(
        customerName,
        'XML_GENERATION',
        `简化版XML文件已生成到 ${simplifiedXmlPath}`
      );
      return simplifiedXmlPath;
    } else {
      console.warn('⚠ 无法生成简化版XML文件');
      logWarning(
        customerName,
        'XML_GENERATION',
        '无法生成简化版XML文件'
      );
      return null;
    }
  } catch (error) {
    console.error('✗ 生成简化版XML文件时出错:', error.message);
    logError(
      customerName,
      'XML_GENERATION',
      `生成简化版XML文件时出错: ${error.message}`,
      error.stack
    );
    throw error;
  }
}

module.exports = {
  generateTempXml
};