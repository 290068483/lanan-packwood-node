const fs = require('fs');
const path = require('path');

/**
 * XML诊断工具类
 * 用于检测XML文件的常见问题并生成诊断报告
 */
class XMLDiagnostics {
  /**
   * 检查文件完整性
   * @param {string} filePath - XML文件路径
   * @returns {Object} 检查结果
   */
  static checkFileIntegrity(filePath) {
    try {
      const stats = fs.statSync(filePath);
      const fileContent = fs.readFileSync(filePath, 'utf8');
      
      return {
        success: true,
        fileSize: stats.size,
        lastModified: stats.mtime,
        endsWithXmlTag: fileContent.trim().endsWith('>'),
        hasContent: fileContent.length > 0
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 检查基础XML格式
   * @param {string} xmlContent - XML内容
   * @returns {Object} 检查结果
   */
  static checkBasicFormat(xmlContent) {
    const result = {
      hasXmlDeclaration: false,
      hasRootElement: false,
      tagsBalanced: true,
      attributesProperlyQuoted: true,
      errors: []
    };

    // 检查XML声明
    result.hasXmlDeclaration = /^<\?xml\s+version=["']1\.[0-9]+["'](?:\s+encoding=["'][a-zA-Z0-9-_]+["'])?/i.test(xmlContent);

    // 检查根元素
    const rootMatch = xmlContent.match(/<[^?][^>]*>/);
    if (rootMatch) {
      result.hasRootElement = true;
    }

    // 检查标签平衡（简单检查）
    const openTags = (xmlContent.match(/<[a-zA-Z][^>\/]*[^\/]>|<[a-zA-Z][^>\/]*\/>/g) || [])
      .filter(tag => !tag.endsWith('/>'))
      .map(tag => tag.match(/<([a-zA-Z][^>\s]*)/)[1]);
    
    const closeTags = (xmlContent.match(/<\/[a-zA-Z][^>]*>/g) || [])
      .map(tag => tag.match(/<\/([a-zA-Z][^>]*)>/)[1]);
    
    if (openTags.length !== closeTags.length) {
      result.tagsBalanced = false;
      result.errors.push(`标签不平衡: 打开标签数 ${openTags.length}, 关闭标签数 ${closeTags.length}`);
    }

    // 检查属性是否正确引用
    const attrPattern = /<[a-zA-Z][^>]*([a-zA-Z][a-zA-Z0-9_-]*)\s*=\s*([^"'][^>\s]*)/g;
    let attrMatch;
    while ((attrMatch = attrPattern.exec(xmlContent)) !== null) {
      result.attributesProperlyQuoted = false;
      result.errors.push(`属性 "${attrMatch[1]}" 值未正确引用: ${attrMatch[2]}`);
    }

    return result;
  }

  /**
   * 检查编码问题
   * @param {string} filePath - XML文件路径
   * @returns {Object} 检查结果
   */
  static checkEncoding(filePath) {
    try {
      // 读取文件的二进制数据
      const buffer = fs.readFileSync(filePath);
      
      // 检测BOM
      let encoding = 'UTF-8';
      let hasBOM = false;
      
      if (buffer.length >= 3 && buffer[0] === 0xEF && buffer[1] === 0xBB && buffer[2] === 0xBF) {
        hasBOM = true;
      } else if (buffer.length >= 2 && buffer[0] === 0xFF && buffer[1] === 0xFE) {
        encoding = 'UTF-16LE';
      } else if (buffer.length >= 2 && buffer[0] === 0xFE && buffer[1] === 0xFF) {
        encoding = 'UTF-16BE';
      }
      
      // 检查乱码字符
      const content = buffer.toString('utf8');
      const garbledPatterns = [
        { pattern: /[锟斤拷]/g, name: '乱码字符"锟斤拷"' },
        { pattern: /[锘跨⒈]/g, name: '乱码字符"锘跨⒈"' },
        { pattern: /[?]{3,}/g, name: '连续问号"???"' }
      ];
      
      const garbledIssues = [];
      garbledPatterns.forEach(({ pattern, name }) => {
        const matches = content.match(pattern);
        if (matches) {
          garbledIssues.push(`${name}: ${matches.length} 处`);
        }
      });
      
      // 检查中文字符
      const chinesePattern = /[\u4e00-\u9fa5]/g;
      const chineseMatches = content.match(chinesePattern);
      const hasChinese = !!chineseMatches;
      
      return {
        success: true,
        encoding,
        hasBOM,
        hasChinese,
        chineseCharCount: chineseMatches ? chineseMatches.length : 0,
        garbledIssues
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 检查XML结构
   * @param {string} xmlContent - XML内容
   * @returns {Object} 检查结果
   */
  static checkStructure(xmlContent) {
    const result = {
      hasRoot: false,
      hasCabinet: false,
      hasPanels: false,
      hasPanel: false,
      cabinetCount: 0,
      panelCount: 0,
      errors: []
    };

    // 检查关键节点
    result.hasRoot = /<Root[^>]*>/.test(xmlContent);
    result.hasCabinet = /<Cabinet[^>]*>/.test(xmlContent);
    result.hasPanels = /<Panels[^>]*>/.test(xmlContent);
    result.hasPanel = /<Panel[^>]*>/.test(xmlContent);

    // 计数关键节点
    const cabinetMatches = xmlContent.match(/<\/Cabinet>/g);
    result.cabinetCount = cabinetMatches ? cabinetMatches.length : 0;
    
    const panelMatches = xmlContent.match(/<\/Panel>/g);
    result.panelCount = panelMatches ? panelMatches.length : 0;

    // 检查结构问题
    if (!result.hasRoot) {
      result.errors.push('缺少Root节点');
    }
    
    if (!result.hasCabinet) {
      result.errors.push('缺少Cabinet节点');
    }
    
    if (!result.hasPanels) {
      result.errors.push('缺少Panels节点');
    }
    
    if (!result.hasPanel) {
      result.errors.push('缺少Panel节点');
    }

    return result;
  }

  /**
   * 生成完整的诊断报告
   * @param {string} filePath - XML文件路径
   * @returns {Object} 诊断报告
   */
  static generateReport(filePath) {
    const report = {
      filePath,
      timestamp: new Date().toISOString(),
      fileIntegrity: null,
      basicFormat: null,
      encoding: null,
      structure: null,
      overallStatus: 'UNKNOWN'
    };

    try {
      // 检查文件完整性
      report.fileIntegrity = this.checkFileIntegrity(filePath);
      
      if (!report.fileIntegrity.success) {
        report.overallStatus = 'ERROR';
        return report;
      }

      // 读取文件内容
      const xmlContent = fs.readFileSync(filePath, 'utf8');

      // 检查基础格式
      report.basicFormat = this.checkBasicFormat(xmlContent);
      
      // 检查编码
      report.encoding = this.checkEncoding(filePath);
      
      // 检查结构
      report.structure = this.checkStructure(xmlContent);
      
      // 确定整体状态
      const hasErrors = 
        (report.basicFormat && report.basicFormat.errors.length > 0) ||
        (report.encoding && report.encoding.garbledIssues && report.encoding.garbledIssues.length > 0) ||
        (report.structure && report.structure.errors.length > 0);
      
      const hasCriticalErrors = 
        (report.basicFormat && (!report.basicFormat.hasRootElement || !report.basicFormat.tagsBalanced)) ||
        (report.structure && report.structure.errors.length > 0);
      
      if (hasCriticalErrors) {
        report.overallStatus = 'CRITICAL';
      } else if (hasErrors) {
        report.overallStatus = 'WARNING';
      } else {
        report.overallStatus = 'GOOD';
      }
      
    } catch (error) {
      report.overallStatus = 'ERROR';
      report.error = error.message;
    }

    return report;
  }

  /**
   * 打印诊断报告
   * @param {Object} report - 诊断报告
   */
  static printReport(report) {
    console.log(`\n=== XML诊断报告 ===`);
    console.log(`文件路径: ${report.filePath}`);
    console.log(`诊断时间: ${report.timestamp}`);
    console.log(`整体状态: ${report.overallStatus}`);
    
    if (report.error) {
      console.log(`错误: ${report.error}`);
      return;
    }
    
    // 文件完整性
    if (report.fileIntegrity) {
      console.log(`\n-- 文件完整性 --`);
      console.log(`  文件大小: ${report.fileIntegrity.fileSize} 字节`);
      console.log(`  最后修改: ${report.fileIntegrity.lastModified}`);
      console.log(`  以XML标签结尾: ${report.fileIntegrity.endsWithXmlTag ? '是' : '否'}`);
      console.log(`  包含内容: ${report.fileIntegrity.hasContent ? '是' : '否'}`);
    }
    
    // 基础格式
    if (report.basicFormat) {
      console.log(`\n-- 基础格式 --`);
      console.log(`  包含XML声明: ${report.basicFormat.hasXmlDeclaration ? '是' : '否'}`);
      console.log(`  包含根元素: ${report.basicFormat.hasRootElement ? '是' : '否'}`);
      console.log(`  标签平衡: ${report.basicFormat.tagsBalanced ? '是' : '否'}`);
      console.log(`  属性正确引用: ${report.basicFormat.attributesProperlyQuoted ? '是' : '否'}`);
      
      if (report.basicFormat.errors.length > 0) {
        console.log(`  错误:`);
        report.basicFormat.errors.forEach(err => console.log(`    - ${err}`));
      }
    }
    
    // 编码
    if (report.encoding && report.encoding.success) {
      console.log(`\n-- 编码 --`);
      console.log(`  检测编码: ${report.encoding.encoding}`);
      console.log(`  包含BOM: ${report.encoding.hasBOM ? '是' : '否'}`);
      console.log(`  包含中文: ${report.encoding.hasChinese ? '是' : '否'}`);
      console.log(`  中文字符数: ${report.encoding.chineseCharCount}`);
      
      if (report.encoding.garbledIssues && report.encoding.garbledIssues.length > 0) {
        console.log(`  乱码问题:`);
        report.encoding.garbledIssues.forEach(issue => console.log(`    - ${issue}`));
      }
    }
    
    // 结构
    if (report.structure) {
      console.log(`\n-- 结构 --`);
      console.log(`  包含Root节点: ${report.structure.hasRoot ? '是' : '否'}`);
      console.log(`  包含Cabinet节点: ${report.structure.hasCabinet ? '是' : '否'}`);
      console.log(`  包含Panels节点: ${report.structure.hasPanels ? '是' : '否'}`);
      console.log(`  包含Panel节点: ${report.structure.hasPanel ? '是' : '否'}`);
      console.log(`  Cabinet节点数: ${report.structure.cabinetCount}`);
      console.log(`  Panel节点数: ${report.structure.panelCount}`);
      
      if (report.structure.errors.length > 0) {
        console.log(`  结构错误:`);
        report.structure.errors.forEach(err => console.log(`    - ${err}`));
      }
    }
  }
}

module.exports = XMLDiagnostics;