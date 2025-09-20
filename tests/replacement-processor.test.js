const fs = require('fs');
const path = require('path');
const { XMLParser, XMLBuilder } = require('fast-xml-parser');

// Mock modules
jest.mock('fs');
jest.mock('chokidar', () => {
  return {
    watch: jest.fn().mockReturnValue({
      on: jest.fn(),
      close: jest.fn()
    })
  };
});

// Mock dependent modules
jest.mock('../src/database/models/customer-fs', () => ({
  getCustomerById: jest.fn()
}), { virtual: true });

jest.mock('../src/utils/replacement-manager', () => ({
  updateReplacementStatus: jest.fn().mockImplementation((customer, status) => {
    return { ...customer, replacementStatus: status };
  })
}), { virtual: true });

jest.mock('../src/utils/data-manager', () => ({
  upsertCustomer: jest.fn().mockResolvedValue(true)
}), { virtual: true });

jest.mock('../src/database/models/replacement', () => ({
  createReplacement: jest.fn().mockResolvedValue(true)
}), { virtual: true });

jest.mock('../src/utils/logger', () => ({
  logInfo: jest.fn(),
  logError: jest.fn(),
  logWarning: jest.fn(),
  logSuccess: jest.fn()
}), { virtual: true });

const { getCustomerById } = require('../src/database/models/customer-fs');
const { updateReplacementStatus } = require('../src/utils/replacement-manager');
const { upsertCustomer } = require('../src/utils/data-manager');
const { createReplacement } = require('../src/database/models/replacement');
const { ReplacementProcessor } = require('../src/services/replacement-processor');

describe('ReplacementProcessor', () => {
  let replacementProcessor;
  let mockWatcher;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();
    
    // Setup chokidar mock
    mockWatcher = {
      on: jest.fn().mockReturnThis(),
      close: jest.fn()
    };
    require('chokidar').watch.mockReturnValue(mockWatcher);
    
    // Create processor instance
    replacementProcessor = new ReplacementProcessor({
      sourcePath: '/mock/source',
      replacementPath: '/mock/source/replacement'
    });
  });

  describe('构造函数', () => {
    test('应该正确初始化属性', () => {
      expect(replacementProcessor.sourcePath).toBe('/mock/source');
      expect(replacementProcessor.replacementPath).toBe('/mock/source/replacement');
      expect(replacementProcessor.isWatching).toBe(false);
      expect(replacementProcessor.watcher).toBeNull();
    });

    test('应该使用默认路径当没有提供选项时', () => {
      const processor = new ReplacementProcessor();
      expect(processor.sourcePath).toBe('./source');
      expect(processor.replacementPath).toBe(path.join('./source', 'replacement'));
    });
  });

  describe('startWatching', () => {
    test('应该启动文件监控', () => {
      fs.existsSync.mockReturnValue(true);
      
      replacementProcessor.startWatching();
      
      expect(require('chokidar').watch).toHaveBeenCalledWith(
        '/mock/source/replacement',
        expect.objectContaining({
          ignored: /(^|[\/\\])\../,
          persistent: true,
          ignoreInitial: true
        })
      );
      expect(mockWatcher.on).toHaveBeenCalledWith('add', expect.any(Function));
      expect(replacementProcessor.isWatching).toBe(true);
    });

    test('当补件目录不存在时应该记录日志', () => {
      fs.existsSync.mockReturnValue(false);
      const logInfo = require('../src/utils/logger').logInfo;
      
      replacementProcessor.startWatching();
      
      expect(logInfo).toHaveBeenCalledWith(
        'ReplacementProcessor',
        '补件目录不存在: /mock/source/replacement'
      );
    });

    test('当已经在监控时应该记录警告', () => {
      replacementProcessor.isWatching = true;
      const logWarning = require('../src/utils/logger').logWarning;
      
      replacementProcessor.startWatching();
      
      expect(logWarning).toHaveBeenCalledWith(
        'ReplacementProcessor',
        '补件监控已启动'
      );
    });
  });

  describe('stopWatching', () => {
    test('应该停止文件监控', () => {
      replacementProcessor.watcher = mockWatcher;
      replacementProcessor.isWatching = true;
      
      replacementProcessor.stopWatching();
      
      expect(mockWatcher.close).toHaveBeenCalled();
      expect(replacementProcessor.isWatching).toBe(false);
      expect(replacementProcessor.watcher).toBeNull();
    });
  });

  describe('extractCustomerUID', () => {
    test('应该从CustomerInfo中提取客户UID', () => {
      const xmlData = {
        CustomerOrder: {
          CustomerInfo: {
            ID: 'customer123'
          }
        }
      };
      
      const result = replacementProcessor.extractCustomerUID(xmlData);
      expect(result).toBe('customer123');
    });

    test('应该从属性中提取客户UID', () => {
      const xmlData = {
        CustomerOrder: {
          '@_customerId': 'customer456'
        }
      };
      
      const result = replacementProcessor.extractCustomerUID(xmlData);
      expect(result).toBe('customer456');
    });

    test('当无法提取UID时应该返回null', () => {
      const xmlData = {
        CustomerOrder: {}
      };
      
      const result = replacementProcessor.extractCustomerUID(xmlData);
      expect(result).toBeNull();
    });
  });

  describe('processReplacementFile', () => {
    test('应该处理有效的补件XML文件', async () => {
      const mockXmlContent = `
        <CustomerOrder>
          <CustomerInfo>
            <ID>customer123</ID>
          </CustomerInfo>
        </CustomerOrder>
      `;
      
      fs.readFileSync.mockReturnValue(mockXmlContent);
      getCustomerById.mockResolvedValue({
        id: 'customer123',
        name: '测试客户',
        status: 'shipped'
      });
      
      await replacementProcessor.processReplacementFile('/path/to/file.xml');
      
      expect(fs.readFileSync).toHaveBeenCalledWith('/path/to/file.xml', 'utf-8');
      expect(getCustomerById).toHaveBeenCalledWith('customer123');
    });

    test('当无法提取客户UID时应该记录警告', async () => {
      const mockXmlContent = `<CustomerOrder></CustomerOrder>`;
      const logWarning = require('../src/utils/logger').logWarning;
      
      fs.readFileSync.mockReturnValue(mockXmlContent);
      
      await replacementProcessor.processReplacementFile('/path/to/file.xml');
      
      expect(logWarning).toHaveBeenCalledWith(
        'ReplacementProcessor',
        '无法从XML文件中提取客户UID: /path/to/file.xml'
      );
    });

    test('当客户不存在时应该记录警告', async () => {
      const mockXmlContent = `
        <CustomerOrder>
          <CustomerInfo>
            <ID>customer123</ID>
          </CustomerInfo>
        </CustomerOrder>
      `;
      const logWarning = require('../src/utils/logger').logWarning;
      
      fs.readFileSync.mockReturnValue(mockXmlContent);
      getCustomerById.mockResolvedValue(null);
      
      await replacementProcessor.processReplacementFile('/path/to/file.xml');
      
      expect(logWarning).toHaveBeenCalledWith(
        'ReplacementProcessor',
        '未找到UID为 customer123 的客户'
      );
    });
  });

  describe('determineReplacementStatus', () => {
    test('应该为部分出货状态确定补件状态', () => {
      const result = replacementProcessor.determineReplacementStatus({}, 'partial');
      expect(result).toBe('partial');
    });

    test('应该为全部出货状态确定补件状态', () => {
      const result = replacementProcessor.determineReplacementStatus({}, 'shipped');
      expect(result).toBe('partial'); // 默认为部分补件
    });
  });

  describe('extractReplacementParts', () => {
    test('应该提取补件板件信息', () => {
      const xmlData = {
        CustomerOrder: {
          Parts: {
            Part: [
              { ID: 'part1' },
              { ID: 'part2' }
            ]
          }
        }
      };
      
      const result = replacementProcessor.extractReplacementParts(xmlData);
      expect(result).toEqual([
        { ID: 'part1' },
        { ID: 'part2' }
      ]);
    });

    test('应该处理单个板件', () => {
      const xmlData = {
        CustomerOrder: {
          Parts: {
            Part: { ID: 'part1' }
          }
        }
      };
      
      const result = replacementProcessor.extractReplacementParts(xmlData);
      expect(result).toEqual([{ ID: 'part1' }]);
    });
  });
});