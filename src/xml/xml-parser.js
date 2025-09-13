// @fileoverview 使用 UTF-8 编码
const { XMLParser, XMLBuilder } = require('fast-xml-parser');
const xml2js = require('xml2js');
const { DOMParser } = require('@xmldom/xmldom');
// 安全地引入libxmljs2模块，如果不存在则设为null
let libxmljs = null;
try {
  libxmljs = require('libxmljs2');
} catch (e) {
  // libxmljs2模块不存在，保持为null
}

/**
 * 解析XML数据 - 使用多种策略
 * @param {string} xmlData - XML数据
 * @param {string} source - 数据源标识
 * @param {string} customerName - 客户名称
 * @returns {object} 解析结果
 */
function parseXmlWithFallback(xmlData, source, customerName) {
  // 策略1: fast-xml-parser (标准配置)
  try {
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
      textNodeName: 'text',
      parseAttributeValue: true,
      parseTagValue: true,
      trimValues: true,
      allowBooleanAttributes: true,
      parseTrueNumberOnly: false,
      stopNodes: ['*.None', '*.Error'],
      ignoreDeclaration: false,
      ignorePiTags: true,
      allowDuplicateAttrs: true,
      removeNSPrefix: true,
      htmlEntities: true,
    });

    const result = parser.parse(xmlData);
    console.log(`✓ fast-xml-parser标准解析器解析成功 (${source})`);
    return { success: true, data: result, method: 'fast-xml-parser-standard' };
  } catch (error) {
    console.warn(`⚠ fast-xml-parser标准解析器解析失败 (${source}):`, error.message);
  }

  // 策略2: fast-xml-parser (宽松配置)
  try {
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
      textNodeName: 'text',
      parseAttributeValue: false,
      parseTagValue: false,
      trimValues: true,
      allowBooleanAttributes: true,
      stopNodes: ['*.None', '*.Error', '*.Unknown'],
      ignoreDeclaration: true,
      ignorePiTags: true,
      removeNSPrefix: true,
      htmlEntities: true,
    });

    const result = parser.parse(xmlData);
    console.log(`✓ fast-xml-parser宽松解析器解析成功 (${source})`);
    return { success: true, data: result, method: 'fast-xml-parser-loose' };
  } catch (error) {
    console.warn(`⚠ fast-xml-parser宽松解析器解析失败 (${source}):`, error.message);
  }

  // 策略3: xml2js
  try {
    const parser = new xml2js.Parser({
      explicitArray: false,
      ignoreAttrs: false,
      trim: true,
      explicitRoot: true,
    });

    let result;
    parser.parseString(xmlData, (err, data) => {
      if (err) throw err;
      result = data;
    });

    if (result) {
      console.log(`✓ xml2js解析成功 (${source})`);
      return { success: true, data: result, method: 'xml2js' };
    }
  } catch (error) {
    console.warn(`⚠ xml2js解析失败 (${source}):`, error.message);
  }

  // 策略4: xmldom
  try {
    const doc = new DOMParser().parseFromString(xmlData, 'text/xml');
    if (doc && doc.documentElement) {
      console.log(`✓ xmldom解析成功 (${source})`);
      return { success: true, data: doc, method: 'xmldom' };
    }
  } catch (error) {
    console.warn(`⚠ xmldom解析失败 (${source}):`, error.message);
  }

  // 策略5: libxmljs2 (如果可用)
  if (libxmljs) {
    try {
      // 自动检测是否包含XML声明
      const hasXmlDeclaration = xmlData.trim().startsWith('<?xml');
      
      // 配置解析选项
      const parseOptions = {
        noblanks: true,     // 忽略空白字符
        nocdata: false,     // 不将CDATA节点转换为文本
        nonet: true,        // 禁止网络访问
        noent: true,        // 替换实体
        dtdload: true,      // 加载DTD
        dtdattr: true       // 使用DTD属性
      };

      // 如果没有XML声明，添加一个标准的XML声明
      const xmlWithDeclaration = hasXmlDeclaration 
        ? xmlData 
        : `<?xml version="1.0" encoding="UTF-8"?>\n${xmlData}`;

      // 使用更强大的parseDocument方法
      const doc = libxmljs.parseDocument(xmlWithDeclaration, parseOptions);
      
      if (doc) {
        console.log(`✓ libxmljs2解析成功 (${source}), 版本: ${doc.version}`);
        return { 
          success: true, 
          data: doc, 
          method: 'libxmljs2', 
          details: {
            version: doc.version,
            encoding: doc.encoding,
            rootElement: doc.root().name()
          }
        };
      }
    } catch (error) {
      console.warn(`⚠ libxmljs2解析失败 (${source}):`, error.message);
      // 提供详细的错误信息
      if (error.stack) {
        console.debug('libxmljs2错误堆栈:', error.stack);
      }
    }
  }

  // 策略6: 正则表达式提取关键数据
  try {
    // 尝试使用正则表达式提取关键节点数据
    const cabinetMatches = xmlData.match(/<Cabinet\s+([^>]+)>([\s\S]*?)<\/Cabinet>/g);
    if (cabinetMatches && cabinetMatches.length > 0) {
      console.log(`✓ 使用正则表达式方式解析XML成功 (${source}), 提取到 ${cabinetMatches.length} 个Cabinet`);
      return { 
        success: true, 
        data: { cabinets: cabinetMatches }, 
        method: 'regex-extraction' 
      };
    }
  } catch (error) {
    console.warn(`⚠ 正则表达式提取失败 (${source}):`, error.message);
  }

  // 所有策略都失败
  console.error(`✗ 所有XML解析策略都失败 (${source})`);
  return { success: false, data: null, method: 'all-failed', error: '所有解析策略都失败' };
}

module.exports = { parseXmlWithFallback };