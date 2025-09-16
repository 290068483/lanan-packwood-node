const fs = require('fs');
const path = require('path');
const { logSuccess, logWarning, logError } = require('./logger');

// 读取配置文件
const configPath = path.join(__dirname, '..', '..', 'config.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

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
    
    // 使用配置中的XML结构模板
    const xmlTemplate = JSON.parse(JSON.stringify(config.xmlStructureTemplate));
    
    // 替换模板中的占位符
    const currentDate = new Date();
    const orderNo = 'F' + currentDate.toISOString().slice(2, 10).replace(/-/g, '');
    const shopOrderCode = 'S' + currentDate.toISOString().slice(2, 10).replace(/-/g, '') + '0001';
    const currentDateTime = currentDate.toISOString().slice(0, 19).replace('T', ' ');
    
    // 递归替换模板中的占位符
    function replacePlaceholders(obj) {
      for (let key in obj) {
        if (typeof obj[key] === 'string') {
          obj[key] = obj[key]
            .replace(/{customerName}/g, customerName)
            .replace(/{currentDateTime}/g, currentDateTime)
            .replace(/{orderNo}/g, orderNo)
            .replace(/{shopOrderCode}/g, shopOrderCode);
        } else if (typeof obj[key] === 'object' && obj[key] !== null) {
          if (key === 'Panel' && obj[key] === '{panels}') {
            // 这是Panel节点的占位符，替换为实际的panels数据
            obj[key] = panels;
          } else {
            replacePlaceholders(obj[key]);
          }
        }
      }
    }
    
    replacePlaceholders(xmlTemplate);
    
    // 创建XML构建器
    const { XMLBuilder } = require('fast-xml-parser');
    const builder = new XMLBuilder({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
      textNodeName: '#text',
      suppressEmptyNode: true,
      format: true,
      indentBy: '\t',
      encoding: 'utf-8'
    });

    // 构建XML数据，包含XML声明
    const simplifiedData = {
      '?xml': {
        '@_version': '1.0',
        '@_encoding': 'utf-8'
      },
      ...xmlTemplate
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
          indent: '\t'
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