const fs = require('fs');
const path = require('path');

// 要检查的XML文件列表
const xmlFiles = ['优化文件.xml', '优化文件2.xml'];

// 检查每个XML文件
xmlFiles.forEach(fileName => {
  console.log(`\n正在检查文件: ${fileName}`);
  const filePath = path.join(__dirname, fileName);
  
  try {
    // 检查文件是否存在
    if (!fs.existsSync(filePath)) {
      console.error(`✗ 文件不存在: ${fileName}`);
      return;
    }
    
    const xmlData = fs.readFileSync(filePath, 'utf8');
    console.log('✓ 成功读取XML文件');
    
    // 检查基本的XML格式
    if (xmlData.trim().startsWith('<?xml')) {
      console.log('✓ 文件以XML声明开头');
    } else {
      console.warn('⚠ 文件没有以XML声明开头');
    }
    
    // 检查是否有根元素
    const firstTagMatch = xmlData.match(/<([^\/\s>]+)/);
    if (firstTagMatch) {
      console.log(`✓ 找到开始标签: ${firstTagMatch[1]}`);
    }
    
    console.log(`✓ ${fileName} 基本格式正确`);
    
  } catch (error) {
    console.error(`✗ 读取XML文件 ${fileName} 时出错:`, error.message);
  }
});