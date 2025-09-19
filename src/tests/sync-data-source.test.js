const fs = require('fs');
const path = require('path');
const { processAllCustomers } = require('../../main');

// 模拟文件系统
jest.mock('fs');

// 模拟DataManager
jest.mock('../../src/utils/data-manager', () => {
  return {
    upsertCustomer: jest.fn(),
    getAllCustomers: jest.fn(),
    getCustomerByName: jest.fn()
  };
});

// 模拟配置文件
jest.mock('../../config.json', () => ({
  sourcePath: 'C:\\test\\source',
  localPath: 'C:\\test\\local',
  networkPath: '\\\\test\\network',
  targetFileName: '板件明细.xlsx',
  enableNetworkSync: true,
  customFileNameFomat: 'yyyyMMdd_customerName#'
}));

// 模拟logger
jest.mock('../../src/utils/logger', () => ({
  logError: jest.fn(),
  logInfo: jest.fn(),
  logSuccess: jest.fn(),
  logWarning: jest.fn()
}));

// 模拟customer-data-processor
jest.mock('../../src/utils/customer-data-processor', () => ({
  processCustomerData: jest.fn()
}));

// 模拟data-integrity-check
jest.mock('../../src/utils/data-integrity-check', () => ({
  checkDataIntegrity: jest.fn()
}));

// 模拟enhanced-file-watcher
jest.mock('../../src/utils/enhanced-file-watcher', () => {
  return jest.fn().mockImplementation(() => {
    return {
      start: jest.fn(),
      stop: jest.fn(),
      watchSourceDirectory: jest.fn(),
      addCallback: jest.fn(),
      addUIUpdateCallback: jest.fn()
    };
  });
});

describe('Sync Data Source Tests', () => {
  let mockConfig;
  let mockDataManager;
  let mockCustomerDataProcessor;

  beforeEach(() => {
    // 清除所有模拟调用记录
    jest.clearAllMocks();
    
    // 获取模拟模块
    mockConfig = require('../../config.json');
    mockDataManager = require('../../src/utils/data-manager');
    mockCustomerDataProcessor = require('../../src/utils/customer-data-processor');
  });

  test('should sync data source to database successfully', async () => {
    // 模拟文件系统
    fs.existsSync.mockImplementation((filePath) => {
      if (filePath === mockConfig.sourcePath) return true;
      return true;
    });
    
    fs.statSync.mockImplementation((filePath) => {
      return {
        isDirectory: () => {
          if (filePath === mockConfig.sourcePath) return true;
          return true;
        }
      };
    });
    
    fs.readdirSync.mockImplementation((dirPath) => {
      if (dirPath === mockConfig.sourcePath) {
        return ['250901_客户A#', '250901_客户B#'];
      }
      return [];
    });
    
    // 模拟客户数据处理结果
    mockCustomerDataProcessor.processCustomerData.mockResolvedValue({
      success: true,
      packagedRows: 10,
      totalRows: 20
    });
    
    // 模拟DataManager方法
    mockDataManager.getCustomerByName.mockReturnValue(null);
    mockDataManager.upsertCustomer.mockReturnValue();
    
    // 执行同步操作
    const result = await processAllCustomers();
    
    // 验证结果
    expect(result).toBeDefined();
    expect(result.successCount).toBe(2);
    expect(result.totalCustomers).toBe(2);
    
    // 验证调用次数
    expect(mockCustomerDataProcessor.processCustomerData).toHaveBeenCalledTimes(2);
    expect(mockDataManager.upsertCustomer).toHaveBeenCalledTimes(2);
    
    // 验证调用参数
    expect(mockCustomerDataProcessor.processCustomerData).toHaveBeenCalledWith(
      path.join(mockConfig.sourcePath, '250901_客户A#'),
      expect.any(String),
      '250901_客户A#',
      mockConfig
    );
    
    expect(mockCustomerDataProcessor.processCustomerData).toHaveBeenCalledWith(
      path.join(mockConfig.sourcePath, '250901_客户B#'),
      expect.any(String),
      '250901_客户B#',
      mockConfig
    );
  });

  test('should handle empty source directory', async () => {
    // 模拟空目录
    fs.existsSync.mockImplementation((filePath) => {
      if (filePath === mockConfig.sourcePath) return true;
      return true;
    });
    
    fs.statSync.mockImplementation((filePath) => {
      return {
        isDirectory: () => {
          if (filePath === mockConfig.sourcePath) return true;
          return true;
        }
      };
    });
    
    fs.readdirSync.mockImplementation((dirPath) => {
      if (dirPath === mockConfig.sourcePath) {
        return []; // 空目录
      }
      return [];
    });
    
    // 执行同步操作
    const result = await processAllCustomers();
    
    // 验证结果
    expect(result).toBeDefined();
    expect(result.successCount).toBe(0);
    expect(result.totalCustomers).toBe(0);
    
    // 验证没有调用处理函数
    expect(mockCustomerDataProcessor.processCustomerData).toHaveBeenCalledTimes(0);
    expect(mockDataManager.upsertCustomer).toHaveBeenCalledTimes(0);
  });

  test('should handle non-existent source directory', async () => {
    // 模拟源目录不存在
    fs.existsSync.mockImplementation((filePath) => {
      if (filePath === mockConfig.sourcePath) return false;
      return true;
    });
    
    // 执行同步操作
    const result = await processAllCustomers();
    
    // 验证结果
    expect(result).toBeDefined();
    expect(result.successCount).toBe(0);
    expect(result.totalCustomers).toBe(0);
  });

  test('should handle customer processing errors', async () => {
    // 模拟文件系统
    fs.existsSync.mockImplementation((filePath) => {
      if (filePath === mockConfig.sourcePath) return true;
      return true;
    });
    
    fs.statSync.mockImplementation((filePath) => {
      return {
        isDirectory: () => {
          if (filePath === mockConfig.sourcePath) return true;
          return true;
        }
      };
    });
    
    fs.readdirSync.mockImplementation((dirPath) => {
      if (dirPath === mockConfig.sourcePath) {
        return ['250901_客户A#'];
      }
      return [];
    });
    
    // 模拟处理错误
    mockCustomerDataProcessor.processCustomerData.mockRejectedValue(new Error('处理失败'));
    mockDataManager.upsertCustomer.mockReturnValue();
    
    // 执行同步操作
    const result = await processAllCustomers();
    
    // 验证结果
    expect(result).toBeDefined();
    expect(result.successCount).toBe(1); // 即使出错也算处理了一个
    expect(result.totalCustomers).toBe(1);
    
    // 验证调用
    expect(mockCustomerDataProcessor.processCustomerData).toHaveBeenCalledTimes(1);
    expect(mockDataManager.upsertCustomer).toHaveBeenCalledTimes(1);
  });
});