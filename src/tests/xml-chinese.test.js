const fs = require('fs');

describe('XML Chinese Content Tests', () => {
  test('should contain Chinese characters in XML attributes', () => {
    const xmlData = fs.readFileSync('优化文件.xml', 'utf8');
    
    // 检查是否存在中文字符
    const hasChinese = /[\u4e00-\u9fa5]/.test(xmlData);
    expect(hasChinese).toBe(true);
    
    // 检查是否包含特定的中文属性值
    expect(xmlData).toContain('福人精板');
    expect(xmlData).toContain('重庆市');
    
    // 检查属性中是否包含中文
    const attributesWithChinese = xmlData.match(/[a-zA-Z]*\s*=\s*"[^"]*[\u4e00-\u9fa5][^"]*"/g);
    expect(attributesWithChinese).not.toBeNull();
    expect(attributesWithChinese.length).toBeGreaterThan(100); // 应该有很多包含中文的属性
  });

  test('should not contain obvious garbled characters', () => {
    const xmlData = fs.readFileSync('优化文件.xml', 'utf8');
    
    // 检查常见乱码字符
    expect(xmlData).not.toMatch(/[锟斤拷]/);
    expect(xmlData).not.toMatch(/[锘跨⒈]/);
    expect(xmlData).not.toMatch(/\?{3,}/); // 连续三个或以上问号
  });

  test('should have balanced XML tags', () => {
    const xmlData = fs.readFileSync('优化文件.xml', 'utf8');
    
    // 统计开标签和闭标签数量
    const openTags = (xmlData.match(/<[^\/>]+>/g) || []).length;
    const closeTags = (xmlData.match(/<\/[^>]+>/g) || []).length;
    
    // 开标签和闭标签数量应该接近
    const difference = Math.abs(openTags - closeTags);
    expect(difference).toBeLessThan(5);
  });
});