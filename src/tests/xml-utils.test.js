const { checkXmlFormat, getXmlInfo } = require('../utils/xml-utils');

describe('XML Utils Tests', () => {
  test('should check XML format correctly for 优化文件.xml', () => {
    const result = checkXmlFormat('优化文件.xml');
    expect(result.valid).toBe(true);
  });

  test('should get XML info correctly', () => {
    const info = getXmlInfo('优化文件.xml');
    expect(info).toHaveProperty('cabinetCount');
    expect(info).toHaveProperty('panelCount');
    expect(info).toHaveProperty('size');
  });
});