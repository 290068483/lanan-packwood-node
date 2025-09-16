try {
  const { generateTempXml } = require('./src/utils/temp-xml-generator.js');
  console.log('✓ 文件导入成功');
} catch (error) {
  console.error('✗ 文件导入失败:', error);
}