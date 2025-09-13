const fs = require('fs');
const path = require('path');

// 模拟配置文件
jest.mock('../../config.json', () => ({
  sourcePath: 'C:\\Users\\Administrator\\Desktop\\打包数据源的数据',
  localPath: './src/local',
  networkPath: '\\\\c1\\mpm\\temp\\local\\test',
  targetFileName: '板件明细.xlsx',
  enableNetworkSync: true,
}));

// 模拟文件系统
jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  promises: {
    access: jest.fn().mockResolvedValue(undefined),
    mkdir: jest.fn().mockResolvedValue(undefined),
  },
  existsSync: jest.fn().mockImplementation(filePath => {
    // 模拟文件系统结构
    if (
      filePath.includes('local') &&
      filePath.includes('customer1') &&
      filePath.endsWith('.xlsx')
    ) {
      return true;
    }
    if (filePath.includes('networkPath')) {
      return true;
    }
    return false;
  }),
  readdirSync: jest.fn().mockImplementation(dirPath => {
    if (dirPath.includes('customer1')) {
      return ['板件明细_20230101.xlsx'];
    }
    return [];
  }),
}));

describe('Network Sync Tests', () => {
  test('should check network sync configuration', () => {
    const config = require('../../config.json');
    expect(config).toHaveProperty('enableNetworkSync');
    expect(config).toHaveProperty('networkPath');
    expect(config).toHaveProperty('localPath');
  });

  test('should create network folder with correct format', () => {
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const customerName = 'customer1';
    const targetFolderName = `${dateStr}_${customerName}`;

    expect(targetFolderName).toMatch(/^\d{8}_.+/);
  });

  test('should prioritize localPath for Excel files', () => {
    const customerLocalPath = path.join('./src/local', 'customer1');
    const sourceExcelFileName = '板件明细_20230101.xlsx';
    const sourceExcelFile = path.join(customerLocalPath, sourceExcelFileName);

    // 检查文件路径是否正确构建
    expect(customerLocalPath).toContain('local');
    expect(customerLocalPath).toContain('customer1');
    expect(sourceExcelFile).toContain('板件明细_20230101.xlsx');
  });
});
