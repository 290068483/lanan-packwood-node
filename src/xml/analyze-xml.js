const fs = require('fs');
const { XMLParser } = require('fast-xml-parser');

// 配置XML解析器
const options = {
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  textNodeName: "text",
  // 不要解析值，避免大型文件内存问题
  parseAttributeValue: false,
  parseTagValue: false,
  // 限制解析深度以提高性能
  ignoreDeclaration: true,
  trimValues: true
};

const parser = new XMLParser(options);

// 要分析的XML文件
const xmlFiles = ['优化文件.xml', '优化文件2.xml'];

xmlFiles.forEach(fileName => {
  console.log(`\n=== 分析文件: ${fileName} ===`);
  
  try {
    const xmlData = fs.readFileSync(fileName, 'utf8');
    console.log(`✓ 成功读取文件，大小: ${xmlData.length} 字符`);
    
    // 获取文件的前几行和后几行来了解结构
    const lines = xmlData.split('\n');
    console.log(`✓ 总行数: ${lines.length}`);
    
    console.log('\n文件开头预览:');
    lines.slice(0, 10).forEach((line, index) => {
      if (line.trim() !== '') {
        console.log(`  ${index + 1}: ${line.trim().substring(0, 100)}${line.length > 100 ? '...' : ''}`);
      }
    });
    
    console.log('\n文件结尾预览:');
    lines.slice(-5).forEach((line, index) => {
      if (line.trim() !== '') {
        const actualIndex = lines.length - 5 + index + 1;
        console.log(`  ${actualIndex}: ${line.trim().substring(0, 100)}${line.length > 100 ? '...' : ''}`);
      }
    });
    
    // 查找特定标签的数量
    const cabinetMatches = (xmlData.match(/<\/Cabinet>/g) || []).length;
    const panelMatches = (xmlData.match(/<\/Panel>/g) || []).length;
    const edgeMatches = (xmlData.match(/<\/Edge>/g) || []).length;
    const machiningMatches = (xmlData.match(/<\/Machining>/g) || []).length;
    
    console.log('\n文件结构统计:');
    console.log(`  Cabinet 节点: ${cabinetMatches}`);
    console.log(`  Panel 节点: ${panelMatches}`);
    console.log(`  Edge 节点: ${edgeMatches}`);
    console.log(`  Machining 节点: ${machiningMatches}`);
    
    // 查找一些关键属性
    const versionMatch = xmlData.match(/McsVersion="([^"]+)"/);
    const exportTimeMatch = xmlData.match(/ExportTime="([^"]+)"/);
    
    if (versionMatch) {
      console.log(`\n文件信息:`);
      console.log(`  McsVersion: ${versionMatch[1]}`);
    }
    
    if (exportTimeMatch) {
      console.log(`  ExportTime: ${exportTimeMatch[1]}`);
    }
    
  } catch (error) {
    console.error(`✗ 分析文件 ${fileName} 时出错:`, error.message);
  }
});