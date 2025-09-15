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
  const mockCabinetData = [
    {
      '@_ID': 'cabinet1',
      '@_Name': '测试柜体',
      Panels: {
        Panel: [
          {
            '@_ID': 'panel1',
            '@_Uid': '58b2e383702249219bc6744e0419a9e6',
            '@_Name': '测试面板1',
            '@_Length': '1000',
            '@_Width': '500',
            '@_Thickness': '18'
          },
          {
            '@_ID': 'panel2',
            '@_Uid': '02e74f241107448d84947c22e43db18d',
            '@_Name': '测试面板2',
            '@_Length': '800',
            '@_Width': '600',
            '@_Thickness': '16'
          }
        ]
      }
    }
  ];

  const customerOutputDir = path.join(__dirname, 'test-output', '20250915_测试客户.');
  const customerName = '测试客户';

  beforeEach(() => {
    // 清除所有mock调用记录
    jest.clearAllMocks();
  });

  // 测试用例：应该正确生成temp.xml文件
  it('should generate temp.xml file successfully', async () => {
    // 模拟fs函数
    fs.existsSync.mockImplementation(() => false);
    fs.mkdirSync.mockImplementation(() => {});
    fs.writeFileSync.mockImplementation(() => {});

    // 执行函数
    await generateTempXml(mockCabinetData, customerOutputDir, '测试客户');
    
    // 验证目录创建函数被调用
    expect(fs.mkdirSync).toHaveBeenCalledWith(customerOutputDir, { recursive: true });
    expect(fs.mkdirSync).toHaveBeenCalledWith(path.join(customerOutputDir, 'srcFiles'), { recursive: true });
    
    // 验证文件写入函数被调用
    expect(fs.writeFileSync).toHaveBeenCalled();
  });

  // 测试用例：应该在目录已存在时处理
  it('should handle directory already exists', async () => {
    // 模拟目录已存在
    fs.existsSync.mockImplementation((path) => {
      return true;
    });
    
    fs.mkdirSync.mockImplementation(() => {});
    fs.writeFileSync.mockImplementation(() => {});

    await generateTempXml(mockCabinetData, customerOutputDir, '测试客户');
    
    // 验证没有尝试创建已存在的目录
    expect(fs.mkdirSync).not.toHaveBeenCalledWith(customerOutputDir, { recursive: true });
    expect(fs.writeFileSync).toHaveBeenCalled();
  });

  // 测试用例：应该处理空的cabinets数据
  it('should handle empty cabinets data', async () => {
    fs.existsSync.mockImplementation(() => false);
    fs.mkdirSync.mockImplementation(() => {});
    fs.writeFileSync.mockImplementation(() => {});
    
    await generateTempXml([], customerOutputDir, '测试客户');
    expect(fs.writeFileSync).toHaveBeenCalled();
  });

  // 测试用例：当文件生成失败时应该抛出错误
  it('should throw error when file generation fails', async () => {
    // 模拟写入文件失败
    fs.writeFileSync.mockImplementation(() => {
      throw new Error('写入文件失败');
    });

    await expect(
      generateTempXml(mockCabinetData, customerOutputDir, '测试客户')
    ).rejects.toThrow('写入文件失败');
  });
});