const { generateTempXml } = require('./src/utils/temp-xml-generator');
const fs = require('fs');
const path = require('path');

// 创建测试数据 - 包含两个不同柜子的面板数据
const testPanels = [
  {
    Cabinet: 'Wardrobe1',
    PanelName: 'Door1',
    Material: 'Wood',
    Size: '1000x2000'
  },
  {
    Cabinet: 'Wardrobe1',
    PanelName: 'Shelf1',
    Material: 'Wood',
    Size: '1000x300'
  },
  {
    Cabinet: 'Wardrobe2',
    PanelName: 'Door2',
    Material: 'Wood',
    Size: '1200x2000'
  },
  {
    Cabinet: 'Wardrobe2',
    PanelName: 'Shelf2',
    Material: 'Wood',
    Size: '1200x300'
  }
];

// 生成临时XML文件进行测试
async function testXmlFormat() {
  try {
    const testXmlPath = path.join(__dirname, 'test-xml-output.xml');
    const customerName = '测试客户';
    const lineDir = 'test-line';
    
    console.log('开始生成测试XML文件...');
    const result = generateTempXml(testPanels, testXmlPath, customerName, lineDir);
    
    if (result) {
      console.log(`测试XML文件已生成到: ${result}`);
      
      // 读取并分析生成的XML文件
      const xmlContent = fs.readFileSync(result, 'utf8');
      console.log('\nXML文件内容概览:');
      console.log('-------------------');
      
      // 统计<cabinets>标签数量
      const cabinetsRegex = /<cabinets>/g;
      const matchCount = (xmlContent.match(cabinetsRegex) || []).length;
      
      console.log(`XML文件中包含 ${matchCount} 个<cabinets>标签`);
      
      // 显示文件的前几行和后几行
      const lines = xmlContent.split('\n');
      console.log('\n文件开头几行:');
      console.log(lines.slice(0, 5).join('\n'));
      
      // 查找第一个cabinets标签的位置
      const firstCabinetIndex = lines.findIndex(line => line.includes('<cabinets>'));
      if (firstCabinetIndex >= 0) {
        console.log('\n第一个<cabinets>标签内容示例:');
        console.log(lines[firstCabinetIndex]);
        // 显示标签内的第一行内容
        if (firstCabinetIndex + 1 < lines.length) {
          console.log(lines[firstCabinetIndex + 1]);
        }
      }
      
      // 清理测试文件
      fs.unlinkSync(result);
      console.log('\n测试完成，已清理测试文件');
    } else {
      console.error('生成测试XML文件失败');
    }
  } catch (error) {
    console.error('测试过程中出错:', error.message);
  }
}

testXmlFormat();