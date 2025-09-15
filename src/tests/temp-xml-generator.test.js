const fs = require('fs');
const path = require('path');
const { generateTempXml } = require('../utils/temp-xml-generator');

// Mock fs模块
jest.mock('fs');

// Mock日志模块
jest.mock('../utils/logger', () => ({
  logSuccess: jest.fn(),
  logWarning: jest.fn(),
  logError: jest.fn()
}));

describe('Temp XML Generator Tests', () => {
  const mockCabinets = [
    {
      '@_Address': '测试地址',
      '@_Customer': '测试客户',
      '@_Name': '测试柜体',
      Panels: {
        Panel: [
          {
            '@_ID': '001',
            '@_Name': '左侧板',
            '@_Length': '800.00',
            '@_Width': '600.00',
            '@_Thickness': '18.00'
          },
          {
            '@_ID': '002',
            '@_Name': '右侧板',
            '@_Length': '800.00',
            '@_Width': '600.00',
            '@_Thickness': '18.00'
          }
        ]
      }
    }
  ];

  const customerOutputDir = path.join(__dirname, 'test-output');
  const customerName = '测试客户';

  beforeEach(() => {
    // 清除所有mock调用记录
    jest.clearAllMocks();
  });

  test('should generate temp.xml file successfully', async () => {
    // 模拟fs.existsSync返回false，表示目录不存在
    fs.existsSync.mockReturnValue(false);
    // 模拟fs.mkdirSync函数
    fs.mkdirSync.mockImplementation(() => {});
    // 模拟fs.writeFileSync函数
    fs.writeFileSync.mockImplementation(() => {});

    const result = await generateTempXml(mockCabinets, customerOutputDir, customerName);

    // 验证目录创建函数被调用
    expect(fs.existsSync).toHaveBeenCalledWith(customerOutputDir);
    expect(fs.mkdirSync).toHaveBeenCalledWith(
      path.join(customerOutputDir, 'srcFiles'),
      { recursive: true }
    );

    // 验证文件写入函数被调用
    expect(fs.writeFileSync).toHaveBeenCalled();

    // 验证返回的文件路径
    expect(result).toBe(
      path.join(customerOutputDir, 'srcFiles', 'temp.xml')
    );
  });

  test('should handle directory already exists', async () => {
    // 模拟fs.existsSync返回true，表示目录已存在
    fs.existsSync.mockImplementation((dirPath) => {
      // 如果检查的是srcFiles目录，返回false表示需要创建
      if (dirPath === path.join(customerOutputDir, 'srcFiles')) {
        return false;
      }
      // 其他目录返回true
      return true;
    });
    // 模拟fs.writeFileSync函数
    fs.writeFileSync.mockImplementation(() => {});

    await generateTempXml(mockCabinets, customerOutputDir, customerName);

    // 验证目录创建函数被调用（检查srcFiles目录）
    expect(fs.mkdirSync).toHaveBeenCalledWith(
      path.join(customerOutputDir, 'srcFiles'),
      { recursive: true }
    );
  });

  test('should handle empty cabinets data', async () => {
    // 模拟fs.existsSync返回false
    fs.existsSync.mockReturnValue(false);
    // 模拟fs.mkdirSync函数
    fs.mkdirSync.mockImplementation(() => {});
    // 模拟fs.writeFileSync函数
    fs.writeFileSync.mockImplementation(() => {});

    const emptyCabinets = [];
    const result = await generateTempXml(emptyCabinets, customerOutputDir, customerName);

    // 验证文件仍然被生成
    expect(fs.writeFileSync).toHaveBeenCalled();
    expect(result).toBe(
      path.join(customerOutputDir, 'srcFiles', 'temp.xml')
    );
  });

  test('should throw error when file generation fails', async () => {
    // 模拟fs.writeFileSync抛出异常
    fs.existsSync.mockReturnValue(false);
    fs.mkdirSync.mockImplementation(() => {});
    fs.writeFileSync.mockImplementation(() => {
      throw new Error('写入文件失败');
    });

    await expect(
      generateTempXml(mockCabinets, customerOutputDir, customerName)
    ).rejects.toThrow('写入文件失败');
  });
});