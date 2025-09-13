const fs = require('fs');
const { XMLParser } = require('fast-xml-parser');
const { DOMParser } = require('@xmldom/xmldom');
const xml2js = require('xml2js');
const cheerio = require('cheerio');

/**
 * 健壮的XML解析器
 * 用于从格式错误的XML中提取数据
 */
class RobustXmlParser {
  /**
   * 多层次解析XML
   * @param {string|Buffer} xmlContent - XML内容
   * @param {Object} options - 解析选项
   * @returns {Object} 解析结果
   */
  static parse(xmlContent, options = {}) {
    const results = {
      success: false,
      data: null,
      method: null,
      errors: []
    };

    // 方法1: 使用fast-xml-parser（首选）
    try {
      const parser = new XMLParser({
        ignoreAttributes: false,
        allowBooleanAttributes: true,
        parseTagValue: false,
        parseAttributeValue: false,
        trimValues: true,
        stopNodes: ['*'] // 遇到错误时继续解析
      });

      const parsedData = parser.parse(xmlContent);
      results.success = true;
      results.data = parsedData;
      results.method = 'fast-xml-parser';
      return results;
    } catch (error) {
      results.errors.push(`fast-xml-parser failed: ${error.message}`);
    }

    // 方法2: 使用xml2js（备选）
    try {
      const parsedData = xml2js.parseStringSync(xmlContent, {
        explicitArray: false,
        ignoreAttrs: false,
        trim: true
      });
      results.success = true;
      results.data = parsedData;
      results.method = 'xml2js';
      return results;
    } catch (error) {
      results.errors.push(`xml2js failed: ${error.message}`);
    }

    // 方法3: 使用xmldom（备选）
    try {
      const dom = new DOMParser().parseFromString(xmlContent, 'text/xml');
      const parsedData = this._domToJson(dom);
      results.success = true;
      results.data = parsedData;
      results.method = 'xmldom';
      return results;
    } catch (error) {
      results.errors.push(`xmldom failed: ${error.message}`);
    }


    // 方法3: 使用cheerio处理HTML-like XML（备选）
    try {
      const $ = cheerio.load(xmlContent, {
        xmlMode: true,
        decodeEntities: false
      });
      const parsedData = this._cheerioToJson($);
      results.success = true;
      results.data = parsedData;
      results.method = 'cheerio';
      return results;
    } catch (error) {
      results.errors.push(`cheerio failed: ${error.message}`);
    }

    // 方法6: 正则表达式直接提取（最后手段）
    try {
      const parsedData = this._extractWithRegex(xmlContent);
      results.success = true;
      results.data = parsedData;
      results.method = 'regex';
      return results;
    } catch (error) {
      results.errors.push(`regex extraction failed: ${error.message}`);
    }

    return results;
  }

  /**
   * 从文件解析XML
   * @param {string} filePath - XML文件路径
   * @param {Object} options - 解析选项
   * @returns {Object} 解析结果
   */
  static parseFromFile(filePath, options = {}) {
    try {
      const xmlContent = fs.readFileSync(filePath, 'utf8');
      return this.parse(xmlContent, options);
    } catch (error) {
      return {
        success: false,
        data: null,
        method: null,
        errors: [`Failed to read file: ${error.message}`]
      };
    }
  }

  /**
   * 将DOM节点转换为JSON对象
   * @param {Object} node - DOM节点
   * @returns {Object} JSON对象
   */
  static _domToJson(node) {
    const obj = {};

    if (node.nodeType === 1) { // 元素节点
      if (node.attributes.length > 0) {
        obj["@attributes"] = {};
        for (let j = 0; j < node.attributes.length; j++) {
          const attribute = node.attributes.item(j);
          obj["@attributes"][attribute.nodeName] = attribute.nodeValue;
        }
      }
    }

    if (node.nodeType === 3) { // 文本节点
      return node.nodeValue.trim();
    }

    if (node.hasChildNodes()) {
      for (let i = 0; i < node.childNodes.length; i++) {
        const item = node.childNodes.item(i);
        const nodeName = item.nodeName;
        
        if (typeof obj[nodeName] === "undefined") {
          obj[nodeName] = this._domToJson(item);
        } else {
          if (typeof obj[nodeName].push === "undefined") {
            obj[nodeName] = [obj[nodeName]];
          }
          obj[nodeName].push(this._domToJson(item));
        }
      }
    }

    return obj;
  }


  /**
   * 将cheerio对象转换为JSON对象
   * @param {Function} $ - cheerio实例
   * @returns {Object} JSON对象
   */
  static _cheerioToJson($) {
    const result = {};
    
    $('*').each((index, element) => {
      const tagName = element.tagName;
      const textContent = $(element).text().trim();
      const attrs = element.attribs || {};
      
      if (tagName && (textContent || Object.keys(attrs).length > 0)) {
        const item = {};
        if (Object.keys(attrs).length > 0) {
          item["@attributes"] = attrs;
        }
        if (textContent) {
          item["#text"] = textContent;
        }
        
        if (!result[tagName]) {
          result[tagName] = [];
        }
        result[tagName].push(item);
      }
    });
    
    return result;
  }

  /**
   * 使用正则表达式提取数据
   * @param {string} xmlContent - XML内容
   * @returns {Object} 提取的数据
   */
  static _extractWithRegex(xmlContent) {
    const data = {};
    
    // 提取标签和内容
    const tagRegex = /<(\w+)(?:\s+([^>]*?))??>([^<]*?)(?=<\/\1>|$)/g;
    let match;
    
    while ((match = tagRegex.exec(xmlContent)) !== null) {
      const tagName = match[1];
      const attributes = match[2] || '';
      const content = match[3].trim();
      
      const item = {};
      
      // 解析属性
      if (attributes) {
        const attrRegex = /(\w+)=(?:"([^"]*)"|'([^']*)')/g;
        let attrMatch;
        const attrs = {};
        
        while ((attrMatch = attrRegex.exec(attributes)) !== null) {
          const attrName = attrMatch[1];
          const attrValue = attrMatch[2] || attrMatch[3] || '';
          attrs[attrName] = attrValue;
        }
        
        if (Object.keys(attrs).length > 0) {
          item["@attributes"] = attrs;
        }
      }
      
      // 添加文本内容
      if (content) {
        item["#text"] = content;
      }
      
      // 存储数据
      if (!data[tagName]) {
        data[tagName] = [];
      }
      data[tagName].push(item);
    }
    
    return data;
  }
}

module.exports = RobustXmlParser;