const { XMLParser } = require('fast-xml-parser');
const xml2js = require('xml2js');
const { DOMParser } = require('@xmldom/xmldom');

const { logInfo, logWarning, logError } = require('./logger');

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
 * 将节点转换为对象
 * @param {Object} node - XML节点
 * @returns {Object} 转换后的对象
 */
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
          obj.text = text;
        }
      }
    }
  }

  return obj;
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
      console.log(`  ⚠ fast-xml-parser宽松解析器解析失败 (${lineDir}): ${looseError.message}`);

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
          console.log(`  ✗ xmldom解析失败 (${lineDir}): ${xmldomError.message}`);

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
      // const content = match[2]; // 未使用的变量，暂时注释

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

module.exports = {
  parseXmlWithFallback,
  extractPanelsWithRegex,
};