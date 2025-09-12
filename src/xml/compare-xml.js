const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// 要比较的XML文件列表
const xmlFiles = ['优化文件.xml', '优化文件2.xml'];
const fileContents = [];
const fileHashes = [];

console.log('正在比较XML文件...\n');

// 读取每个文件并计算哈希值
xmlFiles.forEach((fileName, index) => {
  const filePath = path.join(__dirname, fileName);
  
  try {
    // 检查文件是否存在
    if (!fs.existsSync(filePath)) {
      console.error(`✗ 文件不存在: ${fileName}`);
      return;
    }
    
    const data = fs.readFileSync(filePath);
    fileContents[index] = data;
    
    // 计算文件的哈希值
    const hash = crypto.createHash('md5').update(data).digest('hex');
    fileHashes[index] = hash;
    
    console.log(`文件 ${fileName}:`);
    console.log(`  大小: ${data.length} 字节`);
    console.log(`  MD5: ${hash}\n`);
    
  } catch (error) {
    console.error(`✗ 读取文件 ${fileName} 时出错:`, error.message);
  }
});

// 比较两个文件
if (fileContents.length === 2 && fileContents[0] && fileContents[1]) {
  if (fileContents[0].equals(fileContents[1])) {
    console.log('✓ 两个XML文件内容完全相同');
  } else {
    console.log('✗ 两个XML文件内容不同');
    
    if (fileHashes[0] === fileHashes[1]) {
      console.log('  但哈希值相同，可能存在读取问题');
    } else {
      console.log('  哈希值也不同，确认文件内容确实不同');
    }
  }
}

// 检查文件的基本XML结构
function checkXmlStructure(fileName, xmlData) {
  console.log(`\n检查 ${fileName} 的结构:`);
  
  // 检查XML声明
  const xmlDeclarationMatch = xmlData.toString().match(/<\?xml[^>]*\?>/);
  if (xmlDeclarationMatch) {
    console.log('  ✓ 包含XML声明');
  }
  
  // 检查根元素
  const rootMatch = xmlData.toString().match(/<Root[^>]*>/);
  if (rootMatch) {
    console.log('  ✓ 包含Root元素');
  }
  
  // 计算大致的节点数量
  const panelMatches = xmlData.toString().match(/<\/Panel>/g);
  if (panelMatches) {
    console.log(`  ✓ 包含约 ${panelMatches.length} 个Panel节点`);
  }
}

// 对每个文件进行结构检查
xmlFiles.forEach((fileName, index) => {
  if (fileContents[index]) {
    checkXmlStructure(fileName, fileContents[index]);
  }
});