const fs = require('fs');
const path = require('path');
const CustomerArchiveManager = require('../src/utils/customer-archive-manager');
const DataManager = require('../src/utils/data-manager');
const Database = require('../src/database/connection');
const config = require('../config.json');

// 模拟依赖模块
jest.mock('../src/utils/data-manager');
jest.mock('../src/database/connection');
jest.mock('fs');

// 模拟配置
const testConfig = {
  outputPath: 'C:\\test\\output'
};

// 模拟客户数据
const mockCustomerData = {
  name: '测试客户',
  address: '测试地址',
  outputPath: path.join(testConfig.outputPath, '测试客户')
};

// 模拟包数据
const mockPackagesData = [
  {
    packSeq: '包1',
    weight: 10.5,
    volume: 0.8,
    partIDs: ['ID001', 'ID002', 'ID003'],
    partNames: {
      'ID001': '板件1',
      'ID002': '板件2',
      'ID003': '板件3'
    }
  },
  {
    packSeq: '包2',
    weight: 15.2,
    volume: 1.2,
    partIDs: ['ID004', 'ID005'],
    partNames: {
      'ID004': '板件4',
      'ID005': '板件5'
    }
  }
];

// 模拟数据库实例
const mockDbInstance = {
  query: jest.fn()
};

// 模拟 archiver
const mockArchive = {
  on: jest.fn().mockReturnThis(),
  pipe: jest.fn().mockReturnThis(),
  directory: jest.fn().mockReturnThis(),
  finalize: jest.fn()
};

jest.mock('archiver', () => {
  return jest.fn(() => mockArchive);
});

beforeAll(async () => {
  // 设置测试配置
  global.config = testConfig;

  // 模拟 Database.getInstance 返回 mockDbInstance
  Database.getInstance = jest.fn().mockReturnValue(mockDbInstance);

  // 模拟 fs 方法
  fs.promises = {
    mkdir: jest.fn().mockResolvedValue(undefined),
    writeFile: jest.fn().mockResolvedValue(undefined),
    readFile: jest.fn(),
    rm: jest.fn().mockResolvedValue(undefined)
  };
  
  // 模拟 fs.readFile 以返回 packages.json 的内容
  fs.promises.readFile.mockImplementation((filePath) => {
    if (filePath.endsWith('packages.json')) {
      return Promise.resolve(JSON.stringify(mockPackagesData));
    }
    return Promise.reject(new Error('File not found'));
  });

  // 模拟 fs.existsSync
  fs.existsSync = jest.fn().mockReturnValue(true); // packages.json存在

  // 模拟 DataManager 方法
  DataManager.getCustomer = jest.fn().mockResolvedValue(mockCustomerData);
  DataManager.updateCustomerStatus = jest.fn().mockResolvedValue(true);
  
  // 模拟 createWriteStream
  const mockWriteStream = {
    on: jest.fn().mockImplementation((event, callback) => {
      if (event === 'close') {
        setImmediate(callback);
      }
      return mockWriteStream;
    }),
    pipe: jest.fn().mockReturnThis()
  };
  fs.createWriteStream = jest.fn().mockReturnValue(mockWriteStream);
});

afterAll(async () => {
  // 清理测试目录
  try {
    if (fs.promises && fs.promises.rm) {
      await fs.promises.rm(testConfig.outputPath, { recursive: true, force: true });
    }
  } catch (error) {
    console.error('清理测试目录失败:', error);
  }
});

describe('CustomerArchiveManager', () => {
  describe('archiveCustomer', () => {
    beforeEach(() => {
      // 重置模拟
      jest.clearAllMocks();
      
      // 重新设置模拟
      mockDbInstance.query
        .mockResolvedValueOnce([{ insertId: 1 }]) // 归档记录插入
        .mockResolvedValueOnce([{ insertId: 1 }]) // 包1插入
        .mockResolvedValueOnce([{ insertId: 2 }]); // 包2插入
      
      if (fs.promises) {
        fs.promises.mkdir.mockResolvedValue(undefined);
        fs.promises.rm.mockResolvedValue(undefined);
      }
      
      
      // 模拟 DataManager 方法
      DataManager.getCustomer.mockResolvedValue(mockCustomerData);
      DataManager.updateCustomerStatus.mockResolvedValue(true);
      
      // 模拟 createWriteStream
      const mockWriteStream = {
        on: jest.fn().mockImplementation((event, callback) => {
          if (event === 'close') {
            setImmediate(callback);
          }
          return mockWriteStream;
        }),
        pipe: jest.fn().mockReturnThis()
      };
      fs.createWriteStream.mockReturnValue(mockWriteStream);
      
      // 重置 archiver 模拟
      mockArchive.on.mockReturnThis();
      mockArchive.pipe.mockReturnThis();
      mockArchive.directory.mockReturnThis();
      mockArchive.finalize.mockReturnValue(undefined);
    });

    it('应成功归档客户数据', async () => {
      const result = await CustomerArchiveManager.archiveCustomer('测试客户', '测试操作员', '测试备注');

      expect(result.success).toBe(true);
      expect(result.archiveId).toBeDefined();
      expect(result.message).toContain('已成功归档');
      expect(DataManager.getCustomer).toHaveBeenCalledWith('测试客户');
    });

    it('应处理客户不存在的情况', async () => {
      DataManager.getCustomer.mockResolvedValueOnce(null);

      const result = await CustomerArchiveManager.archiveCustomer('不存在的客户');

      expect(result.success).toBe(false);
      expect(result.message).toContain('客户不存在');
    });

    it('应处理归档过程中的错误', async () => {
      // 模拟 DataManager.getCustomer 抛出错误
      DataManager.getCustomer.mockImplementationOnce(() => {
        throw new Error('模拟的数据库错误');
      });

      const result = await CustomerArchiveManager.archiveCustomer('测试客户');

      expect(result.success).toBe(false);
      expect(result.message).toContain('模拟的数据库错误');
    });
  });

  describe('calculateTotalParts', () => {
    it('应正确计算总板件数', () => {
      const totalParts = CustomerArchiveManager.calculateTotalParts(mockPackagesData);
      expect(totalParts).toBe(5); // 3 + 2
    });

    it('应处理空包数据', () => {
      const totalParts = CustomerArchiveManager.calculateTotalParts([]);
      expect(totalParts).toBe(0);
    });

    it('应处理无partIDs的包数据', () => {
      const packagesWithoutPartIDs = [
        { packSeq: '包1' },
        { packSeq: '包2' }
      ];

      const totalParts = CustomerArchiveManager.calculateTotalParts(packagesWithoutPartIDs);
      expect(totalParts).toBe(0);
    });
  });

  describe('getArchiveList', () => {
    it('应成功获取归档列表', async () => {
      // 模拟数据库查询结果
      mockDbInstance.query
        .mockResolvedValueOnce([[{ id: 1, customer_name: '测试客户' }], [{ total: 10 }]]); // 归档列表查询

      const result = await CustomerArchiveManager.getArchiveList(1, 10);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.total).toBe(10);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(10);
    });
  });

  describe('getArchiveDetail', () => {
    it('应成功获取归档详情', async () => {
      // 模拟数据库查询结果
      mockDbInstance.query
        .mockResolvedValueOnce([[{ id: 1, customer_name: '测试客户' }]]) // 归档详情查询
        .mockResolvedValueOnce([[]]) // 包信息查询
        .mockResolvedValueOnce([[]]); // 板件信息查询

      const result = await CustomerArchiveManager.getArchiveDetail(1);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data.customer_name).toBe('测试客户');
    });

    it('应处理不存在的归档ID', async () => {
      // 模拟数据库返回空结果
      mockDbInstance.query
        .mockResolvedValueOnce([[]]); // 归档不存在

      const result = await CustomerArchiveManager.getArchiveDetail(999);

      expect(result.success).toBe(false);
      expect(result.message).toBe('归档记录不存在');
    });
  });

  describe('restoreArchive', () => {
    beforeEach(() => {
      // 重置所有模拟
      jest.clearAllMocks();
      
      // 为每次测试重新设置数据库查询模拟
      mockDbInstance.query
        .mockResolvedValueOnce([[{ id: 1, customer_name: '测试客户', backup_path: '测试路径' }]]); // 归档详情查询
      
      // 模拟 DataManager 方法
      DataManager.updateCustomerStatus.mockResolvedValue(true);
      
      // 模拟解压功能
      CustomerArchiveManager.extractArchive = jest.fn().mockResolvedValue();
    });

    it('应成功恢复归档', async () => {
      const result = await CustomerArchiveManager.restoreArchive(1, '测试操作员');

      expect(result.success).toBe(true);
      expect(result.message).toContain('已成功恢复');
      expect(DataManager.updateCustomerStatus).toHaveBeenCalledWith(
        '测试客户', 
        '已打包', 
        expect.stringContaining('从归档恢复'), 
        '测试操作员'
      );
    });

    it('应处理不存在的归档', async () => {
      // 模拟数据库返回空结果
      mockDbInstance.query
        .mockResolvedValueOnce([[]]); // 归档不存在

      const result = await CustomerArchiveManager.restoreArchive(999);

      expect(result.success).toBe(false);
      expect(result.message).toBe('归档记录不存在');
    });

    it('应处理备份文件不存在的情况', async () => {
      // 模拟数据库查询结果
      mockDbInstance.query
        .mockResolvedValueOnce([[{ id: 1, customer_name: '测试客户', backup_path: '不存在的路径' }]]); // 归档详情查询

      // 模拟解压功能抛出错误
      CustomerArchiveManager.extractArchive = jest.fn().mockImplementation(() => {
        throw new Error('备份文件不存在');
      });

      const result = await CustomerArchiveManager.restoreArchive(1);

      expect(result.success).toBe(false);
      expect(result.message).toContain('备份文件不存在');
    });
  });
});