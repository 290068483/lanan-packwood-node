const fs = require('fs');

/**
 * 检查XML文件基本格式
 * @param {string} filePath - XML文件路径
 * @returns {object} 检查结果
 */
function checkXmlFormat(filePath) {
  try {
    const xmlData = fs.readFileSync(filePath, 'utf8');
    
    // 基本检查
    const hasXmlDeclaration = xmlData.trim().startsWith('<?xml');
    const hasRootTag = xmlData.includes('<Root') && xmlData.includes('</Root>');
    
    // 检查标签匹配
    const openTags = (xmlData.match(/<[^\/>]+>/g) || []).length;
    const closeTags = (xmlData.match(/<\/[^>]+>/g) || []).length;
    const tagsBalanced = Math.abs(openTags - closeTags) <= 1;
    
    return {
      valid: hasXmlDeclaration && hasRootTag && tagsBalanced,
      hasXmlDeclaration,
      hasRootTag,
      tagsBalanced,
      openTags,
      closeTags
    };
  } catch (error) {
    return {
      valid: false,
      error: error.message
    };
  }
}

/**
 * 获取XML文件基本信息
 * @param {string} filePath - XML文件路径
 * @returns {object} 文件信息
 */
function getXmlInfo(filePath) {
  try {
    const stats = fs.statSync(filePath);
    const xmlData = fs.readFileSync(filePath, 'utf8');
    
    // 计算节点数量
    const panelCount = (xmlData.match(/<\/Panel>/g) || []).length;
    const cabinetCount = (xmlData.match(/<\/Cabinet>/g) || []).length;
    
    return {
      size: stats.size,
      panelCount,
      cabinetCount
    };
  } catch (error) {
    return {
      error: error.message
    };
  }
}

module.exports = {
  checkXmlFormat,
  getXmlInfo
};