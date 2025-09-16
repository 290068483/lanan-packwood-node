const fs = require('fs');
const path = require('path');
const { logSuccess, logWarning, logError } = require('./logger');

/**
 * 生成符合temp-pack目录中XML格式的temp.xml文件
 * @param {Array} panels - Panel数据数组
 * @param {string} tempXmlPath - temp.xml文件路径
 * @param {string} customerName - 客户名称
 * @param {string} lineDir - 产线目录名
 */
function generateTempXml(panels, tempXmlPath, customerName, lineDir) {
  try {
    // 确保输出目录存在
    const outputDir = path.dirname(tempXmlPath);
    
    // 处理长路径问题（Windows系统）
    const normalizedPath = process.platform === 'win32' && outputDir.startsWith('\\\\')
      ? outputDir
      : outputDir.replace(/\\/g, '/');
    
    // 检查路径长度限制（Windows系统）
    if (process.platform === 'win32' && normalizedPath.length > 240) {
      throw new Error(`文件路径过长: ${normalizedPath}（最大长度: 240字符）`);
    }
    
    if (!fs.existsSync(normalizedPath)) {
      fs.mkdirSync(normalizedPath, { recursive: true });
      console.log(`✓ 创建输出目录: ${normalizedPath}`);
      logSuccess(
        customerName,
        'DIRECTORY_CREATED',
        `创建输出目录: ${normalizedPath}`
      );
    }
    
    // 创建虚拟 Cabinet 结构以匹配 temp-pack 目录中的 XML 格式
    const virtualCabinet = {
      '@_ID': '1',
      '@_Name': 'Cabinet1',
      '@_Description': 'Virtual Cabinet',
      Panels: {
        Panel: panels.map((panel, index) => {
          // 保留原始Panel的所有属性，只确保有ID属性
          if (panel['@_'] && panel['@_'].ID !== undefined) {
            // 已经有正确格式的 @_ 结构
            return panel;
          } else if (panel['@_ID'] !== undefined) {
            // 直接具有 @_ID 属性的Panel
            return panel;
          } else {
            // 为没有ID的Panel添加ID，但保留所有其他属性
            return {
              ...panel,
              '@_ID': panel['@_ID'] || panel['@_']?.ID || `P${index + 1}`,
            };
          }
        })
      }
    };
    
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
        Cabinet: virtualCabinet
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

    // 保存为XML文件
    if (simplifiedXml) {
      fs.writeFileSync(tempXmlPath, simplifiedXml, 'utf8');
      console.log(`✓ 简化版XML文件已生成到 ${tempXmlPath}`);
      logSuccess(
        customerName,
        'XML_GENERATION',
        `简化版XML文件已生成到 ${tempXmlPath}`
      );
      return tempXmlPath;
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