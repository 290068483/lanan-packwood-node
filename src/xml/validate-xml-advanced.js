const fs = require('fs');
const { XMLParser } = require('fast-xml-parser');

// 配置XML解析器用于验证
const validationOptions = {
  ignoreAttributes: false,
  allowBooleanAttributes: true,
  parseTagValue: true,
  parseAttributeValue: true,
  trimValues: true
};

const parser = new XMLParser(validationOptions);

// 要验证的XML文件
const xmlFiles = ['优化文件.xml', '优化文件2.xml'];

xmlFiles.forEach(fileName => {
  console.log(`\n=== 验证文件: ${fileName} ===`);
  
  try {
    const xmlData = fs.readFileSync(fileName, 'utf8');
    console.log('✓ 成功读取文件');
    
    // 尝试解析XML来验证其结构
    const parsedData = parser.parse(xmlData);
    console.log('✓ XML结构有效，可以成功解析');
    
    // 显示根节点信息
    if (parsedData.Root) {
      console.log(`✓ 根节点: Root`);
      
      if (parsedData.Root['@_McsVersion']) {
        console.log(`  McsVersion: ${parsedData.Root['@_McsVersion']}`);
      }
      
      if (parsedData.Root['@_ExportTime']) {
        console.log(`  ExportTime: ${parsedData.Root['@_ExportTime']}`);
      }
      
      // 检查Cabinet节点
      if (parsedData.Root.Cabinet) {
        console.log('✓ 包含 Cabinet 节点');
        
        // 检查Panels节点
        if (parsedData.Root.Cabinet.Panels) {
          console.log('✓ 包含 Panels 节点');
          
          // 检查Panel节点
          const panels = parsedData.Root.Cabinet.Panels.Panel;
          if (panels) {
            if (Array.isArray(panels)) {
              console.log(`✓ 包含 ${panels.length} 个 Panel 节点`);
            } else {
              console.log('✓ 包含 1 个 Panel 节点');
            }
          }
        }
      }
    }
    
  } catch (error) {
    console.error(`✗ 验证文件 ${fileName} 时出错:`, error.message);
  }
});