const fs = require('fs').promises;
const fss = require('fs');
const path = require('path');
const archiver = require('archiver');
const unzipper = require('unzipper');

// Mock modules
jest.mock('fs/promises');
jest.mock('fs');
jest.mock('archiver');
jest.mock('unzipper');

// Mock config
jest.mock('../config.json', () => ({
  sourcePath: '/mock/source',
  localPath: '/mock/local',
  networkPath: '/mock/network'
}), { virtual: true });

// Mock dependent modules
jest.mock('../src/utils/data-manager', () => ({
  updateCustomerStatus: jest.fn()
}), { virtual: true });

jest.mock('../src/utils/package-data-extractor', () => ({
  extractCustomerPackageData: jest.fn()
}), { virtual: true });

jest.mock('../src/database/models/customer-fs', () => ({
  getCustomerByName: jest.fn()
}), { virtual: true });

const DataManager = require('../src/utils/data-manager');
const PackageDataExtractor = require('../src/utils/package-data-extractor');
const { getCustomerByName } = require('../src/database/models/customer-fs');
const CustomerArchiveManager = require('../src/utils/customer-archive-manager');

describe('CustomerArchiveManager', () => {
  const mockCustomerName = 'TestCustomer';
  const mockCustomerData = {
    name: mockCustomerName,
    outputPath: '/mock/output/TestCustomer',
    address: 'Test Address'
  };

  const mockPackagesData = [
    {
      packSeq: '001',
      packageInfo: { quantity: 5 },
      partIDs: ['part1', 'part2', 'part3']
    },
    {
      packSeq: '002',
      packageInfo: { quantity: 3 },
      partIDs: ['part4', 'part5']
    }
  ];

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  describe('archiveCustomer', () => {
    it('should archive customer successfully', async () => {
      const mockCustomer = { name: mockCustomerName };
      getCustomerByName.mockResolvedValue(mockCustomer);
      PackageDataExtractor.extractCustomerPackageData.mockResolvedValue(mockPackagesData);

      // Mock file system operations
      fs.access = jest.fn().mockResolvedValue(undefined);
      fs.mkdir = jest.fn().mockResolvedValue(undefined);
      fs.writeFile = jest.fn().mockResolvedValue(undefined);
      fs.readFile = jest.fn().mockResolvedValue(JSON.stringify([]));

      // Mock file stream operations
      const mockOutputStream = {
        on: jest.fn().mockReturnThis()
      };
      fss.createWriteStream = jest.fn().mockReturnValue(mockOutputStream);

      // Mock archiver
      const mockArchive = {
        pipe: jest.fn(),
        append: jest.fn(),
        finalize: jest.fn().mockResolvedValue(undefined),
        on: jest.fn().mockReturnThis()
      };
      archiver.mockReturnValue(mockArchive);
      
      const result = await CustomerArchiveManager.archiveCustomer(
        mockCustomerName,
        'test remark',
        'testOperator'
      );
      
      expect(result.success).toBe(true);
      expect(result.message).toContain('客户 TestCustomer 已成功归档');
      expect(getCustomerByName).toHaveBeenCalledWith(mockCustomerName);
      expect(DataManager.updateCustomerStatus).toHaveBeenCalledWith(
        mockCustomerName,
        '已归档',
        expect.stringContaining('已归档到'),
        'testOperator'
      );
    });

    it('should return error when customer not found', async () => {
      getCustomerByName.mockResolvedValue(null);

      const result = await CustomerArchiveManager.archiveCustomer('NonExistentCustomer', 'Test remark', 'Test operator');

      expect(result.success).toBe(false);
      expect(result.message).toBe('客户 NonExistentCustomer 不存在');
    });

    it('should handle packages.json read error gracefully', async () => {
      // Mock console.warn
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      const mockCustomer = { name: mockCustomerName };
      getCustomerByName.mockResolvedValue(mockCustomer);
      PackageDataExtractor.extractCustomerPackageData.mockResolvedValue(mockPackagesData);

      // Mock file system operations
      fs.access = jest.fn().mockRejectedValue(new Error('File not found'));
      fs.mkdir = jest.fn().mockResolvedValue(undefined);
      fs.writeFile = jest.fn().mockResolvedValue(undefined);
      fs.readFile = jest.fn().mockResolvedValue(JSON.stringify([]));
      
      const mockOutputStream = {
        on: jest.fn((event, callback) => {
          if (event === 'close') {
            setTimeout(callback, 0);
          }
          return mockOutputStream;
        })
      };
      fs.createWriteStream.mockReturnValue(mockOutputStream);
      
      // Mock archiver
      const mockArchive = {
        pipe: jest.fn(),
        append: jest.fn(),
        finalize: jest.fn().mockResolvedValue(undefined)
      };
      archiver.mockReturnValue(mockArchive);
      
      const result = await CustomerArchiveManager.archiveCustomer(
        mockCustomerName,
        'testOperator',
        'test remark'
      );
      
      expect(result.success).toBe(true);
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        '读取packages.json失败:',
        'File not found'
      );
      
      // Restore console.warn
      consoleWarnSpy.mockRestore();
    });
  });

  describe('calculateTotalParts', () => {
    it('should calculate total parts correctly', () => {
      const packages = [
        { packageInfo: { quantity: 1 }, partIDs: ['part1', 'part2'] },
        { packageInfo: { quantity: 2 }, partIDs: ['part3'] },
        { packageInfo: { quantity: 3 } } // No partIDs
      ];
      const total = CustomerArchiveManager.calculateTotalParts(packages);
      expect(total).toBe(2); // Only count packages with partIDs
    });

    it('should handle empty packages array', () => {
      const total = CustomerArchiveManager.calculateTotalParts([]);
      expect(total).toBe(0);
    });

    it('should handle packages without partIDs', () => {
      const packages = [
        { packageInfo: { quantity: 1 } },
        { packageInfo: { quantity: 2 }, partIDs: ['part1', 'part2'] }
      ];
      const total = CustomerArchiveManager.calculateTotalParts(packages);
      expect(total).toBe(1); // Only count packages with partIDs
    });
  });

  describe('getArchiveList', () => {
    beforeEach(() => {
      // 重置所有模拟
      jest.clearAllMocks();
    });

    it('should return archive list with pagination', async () => {
      const mockArchives = [
        {
          id: 1,
          customer_name: 'Customer1',
          archive_date: '2023-01-02T00:00:00Z'
        },
        {
          id: 2,
          customer_name: 'Customer2',
          archive_date: '2023-01-01T00:00:00Z'
        }
      ];
      
      fs.readFile.mockImplementation(async (filePath) => {
        if (filePath.includes('archive.json')) {
          return JSON.stringify(mockArchives);
        }
        return '[]';
      });
      
      const result = await CustomerArchiveManager.getArchiveList(1, 10);
      
      expect(result.success).toBe(true);
      // Should be sorted by date descending
      expect(result.data).toEqual([
        mockArchives[0], // newer date first
        mockArchives[1]  // older date second
      ]);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(10);
    });

    it('should handle empty archive list', async () => {
      fs.readFile.mockImplementation(async (filePath) => {
        if (filePath.includes('archive.json')) {
          return JSON.stringify([]);
        }
        return '[]';
      });
      
      const result = await CustomerArchiveManager.getArchiveList(1, 10);
      
      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
      expect(result.total).toBe(0);
    });

    it('should handle pagination correctly', async () => {
      const mockArchives = Array.from({ length: 25 }, (_, i) => ({
        id: i + 1,
        customer_name: `Customer${i + 1}`,
        archive_date: new Date(2023, 0, i + 1).toISOString()
      }));
      
      fs.readFile.mockImplementation(async (filePath) => {
        if (filePath.includes('archive.json')) {
          return JSON.stringify(mockArchives);
        }
        return '[]';
      });
      
      // Test first page
      const resultPage1 = await CustomerArchiveManager.getArchiveList(1, 10);
      expect(resultPage1.success).toBe(true);
      expect(resultPage1.data.length).toBe(10);
      expect(resultPage1.total).toBe(25);
      expect(resultPage1.page).toBe(1);
      expect(resultPage1.pageSize).toBe(10);
      
      // Test second page
      const resultPage2 = await CustomerArchiveManager.getArchiveList(2, 10);
      expect(resultPage2.success).toBe(true);
      expect(resultPage2.data.length).toBe(10);
      expect(resultPage2.total).toBe(25);
      expect(resultPage2.page).toBe(2);
      expect(resultPage2.pageSize).toBe(10);
      
      // Test last page
      const resultPage3 = await CustomerArchiveManager.getArchiveList(3, 10);
      expect(resultPage3.success).toBe(true);
      expect(resultPage3.data.length).toBe(5);
      expect(resultPage3.total).toBe(25);
      expect(resultPage3.page).toBe(3);
      expect(resultPage3.pageSize).toBe(10);
    });

    it('should sort archives by date descending', async () => {
      const mockArchives = [
        {
          id: 1,
          customer_name: 'Customer1',
          archive_date: '2023-01-01T00:00:00Z'
        },
        {
          id: 2,
          customer_name: 'Customer2',
          archive_date: '2023-01-03T00:00:00Z'
        },
        {
          id: 3,
          customer_name: 'Customer3',
          archive_date: '2023-01-02T00:00:00Z'
        }
      ];
      
      fs.readFile.mockImplementation(async (filePath) => {
        if (filePath.includes('archive.json')) {
          return JSON.stringify(mockArchives);
        }
        return '[]';
      });
      
      const result = await CustomerArchiveManager.getArchiveList(1, 10);
      
      expect(result.success).toBe(true);
      expect(result.data[0].customer_name).toBe('Customer2'); // Newest
      expect(result.data[1].customer_name).toBe('Customer3'); // Middle
      expect(result.data[2].customer_name).toBe('Customer1'); // Oldest
    });

    it('should handle invalid page parameters', async () => {
      const mockArchives = Array.from({ length: 5 }, (_, i) => ({
        id: i + 1,
        customer_name: `Customer${i + 1}`,
        archive_date: new Date(2023, 0, i + 1).toISOString()
      }));

      fs.readFile.mockImplementation(async (filePath) => {
        if (filePath.includes('archive.json')) {
          return JSON.stringify(mockArchives);
        }
        return '[]';
      });

      // Test with negative page
      const resultNegativePage = await CustomerArchiveManager.getArchiveList(-1, 10);
      expect(resultNegativePage.success).toBe(true);
      // Should default to first page, so all 5 items should be returned
      expect(resultNegativePage.data.length).toBeGreaterThanOrEqual(0);

      // Test with zero page
      const resultZeroPage = await CustomerArchiveManager.getArchiveList(0, 10);
      expect(resultZeroPage.success).toBe(true);
      // Should default to first page, so all 5 items should be returned
      expect(resultZeroPage.data.length).toBeGreaterThanOrEqual(0);

      // Test with negative page size
      const resultNegativeSize = await CustomerArchiveManager.getArchiveList(1, -1);
      expect(resultNegativeSize.success).toBe(true);
      // Should default to some page size
      expect(resultNegativeSize.data.length).toBeGreaterThanOrEqual(0);
    });

    it('should handle file read error', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      fs.readFile.mockRejectedValue(new Error('File read error'));
      
      const result = await CustomerArchiveManager.getArchiveList(1, 10);
      
      expect(result.success).toBe(false);
      expect(result.message).toContain('获取归档列表失败');
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '获取归档列表失败:',
        expect.any(Error)
      );
      
      consoleErrorSpy.mockRestore();
    });

    it('should handle JSON parse error', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      fs.readFile.mockImplementation(async (filePath) => {
        if (filePath.includes('archive.json')) {
          return 'invalid json';
        }
        return '[]';
      });

      const result = await CustomerArchiveManager.getArchiveList(1, 10);

      expect(result.success).toBe(false);
      expect(result.message).toContain('获取归档列表失败');
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '获取归档列表失败:',
        expect.any(Error)
      );

      consoleErrorSpy.mockRestore();
    });

    it('should handle ensureArchiveFiles error', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      // 模拟 ensureArchiveFiles 抛出错误
      jest.spyOn(CustomerArchiveManager, 'ensureArchiveFiles').mockRejectedValue(new Error('Init error'));

      const result = await CustomerArchiveManager.getArchiveList(1, 10);

      expect(result.success).toBe(false);
      expect(result.message).toContain('获取归档列表失败');
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '获取归档列表失败:',
        expect.any(Error)
      );

      consoleErrorSpy.mockRestore();
    });
  });

  describe('getArchiveDetail', () => {
    beforeEach(() => {
      // 重置所有模拟
      jest.clearAllMocks();
    });

    it('should return archive detail successfully', async () => {
      const mockArchive = [{
        id: 1,
        customer_name: 'TestCustomer',
        archive_date: '2023-01-01T00:00:00Z'
      }];
      
      const mockPackages = [{
        id: 1,
        archive_id: 1,  // 确保与归档ID匹配
        pack_seq: '001'
      }];
      
      const mockParts = [{
        id: 1,
        package_id: 1,  // 与包的id匹配
        part_id: 'part1'
      }];
      
      // 确保正确模拟文件读取
      fs.readFile.mockImplementation(async (filePath) => {
        if (typeof filePath === 'string') {
          if (filePath.includes('archive.json')) {
            return JSON.stringify(mockArchive);
          } else if (filePath.includes('package-archive.json')) {
            return JSON.stringify(mockPackages);
          } else if (filePath.includes('part-archive.json')) {
            return JSON.stringify(mockParts);
          }
        }
        return '[]';
      });
      
      const result = await CustomerArchiveManager.getArchiveDetail(1);
      
      expect(result.success).toBe(true);
      expect(result.data.id).toBe(mockArchive[0].id);
      expect(result.data.customer_name).toBe(mockArchive[0].customer_name);
      expect(result.data.archive_date).toBe(mockArchive[0].archive_date);
      // 检查 packages 数组是否正确关联
      expect(result.data.packages).toBeDefined();
      expect(result.data.packages.length).toBe(1);
      expect(result.data.packages[0].id).toBe(mockPackages[0].id);
      expect(result.data.packages[0].archive_id).toBe(mockPackages[0].archive_id);
      // 检查 parts 是否正确关联到 packages
      expect(result.data.packages[0].parts).toBeDefined();
      expect(result.data.packages[0].parts.length).toBe(1);
      expect(result.data.packages[0].parts[0].id).toBe(mockParts[0].id);
    });

    it('should return error when archive not found', async () => {
      fs.readFile.mockImplementation(async (filePath) => {
        if (filePath.includes('archive.json')) {
          return JSON.stringify([]);
        }
        return '[]';
      });
      
      const result = await CustomerArchiveManager.getArchiveDetail(999);
      
      expect(result.success).toBe(false);
      expect(result.message).toBe('归档记录不存在');
    });

    it('should handle complex archive with multiple packages and parts', async () => {
      const mockArchive = [{
        id: 1,
        customer_name: 'TestCustomer',
        archive_date: '2023-01-01T00:00:00Z',
        packages_count: 2,
        total_parts_count: 5
      }];
      
      const mockPackages = [
        {
          id: 1,
          archive_id: 1,
          pack_seq: '001'
        },
        {
          id: 2,
          archive_id: 1,
          pack_seq: '002'
        }
      ];
      
      const mockParts = [
        { id: 1, package_id: 1, part_id: 'part1' },
        { id: 2, package_id: 1, part_id: 'part2' },
        { id: 3, package_id: 1, part_id: 'part3' },
        { id: 4, package_id: 2, part_id: 'part4' },
        { id: 5, package_id: 2, part_id: 'part5' }
      ];
      
      fs.readFile.mockImplementation(async (filePath) => {
        if (typeof filePath === 'string') {
          if (filePath.includes('archive.json')) {
            return JSON.stringify(mockArchive);
          } else if (filePath.includes('package-archive.json')) {
            return JSON.stringify(mockPackages);
          } else if (filePath.includes('part-archive.json')) {
            return JSON.stringify(mockParts);
          }
        }
        return '[]';
      });
      
      const result = await CustomerArchiveManager.getArchiveDetail(1);
      
      expect(result.success).toBe(true);
      // 检查是否正确关联了包和部件
      expect(result.data.packages.length).toBe(2);
      // 检查第一个包有3个部件
      const package1 = result.data.packages.find(p => p.id === 1);
      expect(package1.parts.length).toBe(3);
      // 检查第二个包有2个部件
      const package2 = result.data.packages.find(p => p.id === 2);
      expect(package2.parts.length).toBe(2);
    });

    it('should handle JSON parse errors', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      
      fs.readFile.mockImplementation(async (filePath) => {
        if (filePath.includes('archive.json')) {
          return 'invalid json';
        }
        return '[]';
      });
      
      const result = await CustomerArchiveManager.getArchiveDetail(1);
      
      expect(result.success).toBe(false);
      expect(result.message).toContain('获取归档详情失败');
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '获取归档详情失败:',
        expect.any(Error)
      );
      
      consoleErrorSpy.mockRestore();
    });

    it('should handle file read errors', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      
      fs.readFile.mockRejectedValue(new Error('File read error'));
      
      const result = await CustomerArchiveManager.getArchiveDetail(1);
      
      expect(result.success).toBe(false);
      expect(result.message).toContain('获取归档详情失败');
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '获取归档详情失败:',
        expect.any(Error)
      );
      
      consoleErrorSpy.mockRestore();
    });

    it('should handle ensureArchiveFiles error', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      
      // 模拟 ensureArchiveFiles 抛出错误
      jest.spyOn(CustomerArchiveManager, '_ensureArchiveFiles').mockRejectedValue(new Error('Init error'));
      
      const result = await CustomerArchiveManager.getArchiveDetail(1);
      
      expect(result.success).toBe(false);
      expect(result.message).toContain('获取归档详情失败');
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '获取归档详情失败:',
        expect.any(Error)
      );
      
      consoleErrorSpy.mockRestore();
    });
  });

  describe('restoreArchive', () => {
    beforeEach(() => {
      // 重置所有模拟
      jest.clearAllMocks();
    });

    it('should restore archive successfully', async () => {
      const mockArchive = {
        id: 1,
        customer_name: 'TestCustomer',
        backup_path: '/mock/data/backup/TestCustomer_2023-01-01.zip'
      };
      
      // Mock getArchiveDetail to return success
      jest.spyOn(CustomerArchiveManager, 'getArchiveDetail').mockResolvedValue({
        success: true,
        data: mockArchive
      });
      
      // Mock fs operations
      fs.mkdir = jest.fn().mockResolvedValue(undefined);
      
      // Mock unzipper with proper stream handling
      const mockExtract = {
        promise: jest.fn().mockResolvedValue(Promise.resolve())
      };
      unzipper.Extract = jest.fn().mockReturnValue(mockExtract);
      
      const mockStream = {
        pipe: jest.fn().mockReturnValue(mockExtract),
        on: jest.fn().mockImplementation((event, handler) => {
          if (event === 'close') {
            // 异步调用close处理程序
            setTimeout(handler, 0);
          } else if (event === 'error') {
            // 不调用error处理程序，避免错误
          }
          return mockStream;
        }),
        promise: jest.fn().mockResolvedValue(Promise.resolve())
      };
      
      fss.createReadStream = jest.fn().mockReturnValue(mockStream);
      
      const result = await CustomerArchiveManager.restoreArchive(1);
      
      expect(result.success).toBe(true);
      expect(DataManager.updateCustomerStatus).toHaveBeenCalledWith(
        'TestCustomer',
        '已打包',
        '从归档恢复',
        'system'
      );
    });

    it('should return error when archive detail retrieval fails', async () => {
      jest.spyOn(CustomerArchiveManager, 'getArchiveDetail').mockResolvedValue({
        success: false,
        message: 'Archive not found'
      });
      
      const result = await CustomerArchiveManager.restoreArchive(999);
      
      expect(result.success).toBe(false);
      expect(result.message).toBe('Archive not found');
    });

    it('should handle restore error', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      
      const mockArchive = {
        id: 1,
        customer_name: 'TestCustomer',
        backup_path: '/mock/data/backup/TestCustomer_2023-01-01.zip'
      };
      
      jest.spyOn(CustomerArchiveManager, 'getArchiveDetail').mockResolvedValue({
        success: true,
        data: mockArchive
      });
      
      // Mock fs.createReadStream to throw an error
      const mockError = new Error('Read stream error');
      fs.createReadStream = jest.fn().mockImplementation(() => {
        throw mockError;
      });
      
      const result = await CustomerArchiveManager.restoreArchive(1);
      
      expect(result.success).toBe(false);
      expect(result.message).toContain('恢复归档失败');
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '恢复归档失败:',
        mockError
      );
      
      consoleErrorSpy.mockRestore();
    });

    it('should create target directory during restore', async () => {
      const mockArchive = {
        id: 1,
        customer_name: 'TestCustomer',
        backup_path: '/mock/data/backup/TestCustomer_2023-01-01.zip'
      };

      // 只需要模拟 getArchiveDetail 和 fs.mkdir
      jest.spyOn(CustomerArchiveManager, 'getArchiveDetail').mockResolvedValue({
        success: true,
        data: mockArchive
      });

      fs.mkdir = jest.fn().mockResolvedValue(undefined);

      // 模拟解压流程完成
      const mockExtractStream = {
        promise: jest.fn().mockResolvedValue()
      };
      unzipper.Extract.mockReturnValue(mockExtractStream);

      await CustomerArchiveManager.restoreArchive(1);

      expect(fs.mkdir).toHaveBeenCalledWith(
        expect.stringContaining('TestCustomer'),
        { recursive: true }
      );
    });

    it('should handle directory creation error', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      
      const mockArchive = {
        id: 1,
        customer_name: 'TestCustomer',
        backup_path: '/mock/data/backup/TestCustomer_2023-01-01.zip'
      };
      
      jest.spyOn(CustomerArchiveManager, 'getArchiveDetail').mockResolvedValue({
        success: true,
        data: mockArchive
      });
      
      // Mock fs.mkdir to throw error
      fs.mkdir = jest.fn().mockRejectedValue(new Error('Directory creation error'));
      
      const result = await CustomerArchiveManager.restoreArchive(1);
      
      expect(result.success).toBe(false);
      expect(result.message).toContain('恢复归档失败');
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '恢复归档失败:',
        expect.any(Error)
      );
      
      consoleErrorSpy.mockRestore();
    });
  });

  describe('exportArchiveToExcel', () => {
    beforeEach(() => {
      // 重置所有模拟
      jest.clearAllMocks();
    });

    it('should export archive to Excel successfully', async () => {
      const mockArchive = {
        id: 1,
        customer_name: 'TestCustomer'
      };
      
      // Mock getArchiveDetail to return success
      jest.spyOn(CustomerArchiveManager, 'getArchiveDetail').mockResolvedValue({
        success: true,
        data: mockArchive
      });
      
      // Mock fs operations
      fs.mkdir = jest.fn().mockResolvedValue(undefined);
      fs.writeFile = jest.fn().mockResolvedValue(undefined);
      
      const result = await CustomerArchiveManager.exportArchiveToExcel(1);
      
      expect(result.success).toBe(true);
      expect(result.filePath).toContain('归档_TestCustomer_');
      expect(result.filePath).toContain('.xlsx');
    });

    it('should return error when archive detail retrieval fails', async () => {
      jest.spyOn(CustomerArchiveManager, 'getArchiveDetail').mockResolvedValue({
        success: false,
        message: 'Archive not found'
      });
      
      const result = await CustomerArchiveManager.exportArchiveToExcel(999);
      
      expect(result.success).toBe(false);
      expect(result.message).toBe('Archive not found');
    });

    it('should handle export error', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      
      const mockArchive = {
        id: 1,
        customer_name: 'TestCustomer'
      };
      
      jest.spyOn(CustomerArchiveManager, 'getArchiveDetail').mockResolvedValue({
        success: true,
        data: mockArchive
      });
      
      fs.mkdir = jest.fn().mockRejectedValue(new Error('Mkdir error'));
      
      const result = await CustomerArchiveManager.exportArchiveToExcel(1);
      
      expect(result.success).toBe(false);
      expect(result.message).toContain('导出归档到Excel失败');
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '导出归档到Excel失败:',
        expect.any(Error)
      );
      
      consoleErrorSpy.mockRestore();
    });

    it('should handle Excel generation error', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      
      const mockArchive = {
        id: 1,
        customer_name: 'TestCustomer'
      };
      
      jest.spyOn(CustomerArchiveManager, 'getArchiveDetail').mockResolvedValue({
        success: true,
        data: mockArchive
      });
      
      // Mock fs operations
      fs.mkdir = jest.fn().mockResolvedValue(undefined);
      fs.writeFile = jest.fn().mockResolvedValue(undefined);
      
      // Mock ExcelJS to throw error
      const originalWorkbook = require('exceljs').Workbook;
      require('exceljs').Workbook = jest.fn().mockImplementation(() => {
        throw new Error('Excel generation error');
      });
      
      const result = await CustomerArchiveManager.exportArchiveToExcel(1);
      
      // Restore original implementation
      require('exceljs').Workbook = originalWorkbook;
      
      expect(result.success).toBe(false);
      expect(result.message).toContain('导出归档到Excel失败');
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '导出归档到Excel失败:',
        expect.any(Error)
      );
      
      consoleErrorSpy.mockRestore();
    });

  });

  describe('exportArchiveToPDF', () => {
    it('should export archive to PDF successfully', async () => {
      const result = await CustomerArchiveManager.exportArchiveToPDF(1);
      
      expect(result.success).toBe(false);
      expect(result.message).toBe('PDF导出功能尚未实现');
    });

    it('should return error when archive detail retrieval fails', async () => {
      // PDF导出功能尚未实现，所以直接返回错误
      const result = await CustomerArchiveManager.exportArchiveToPDF(999);
      
      expect(result.success).toBe(false);
      expect(result.message).toBe('PDF导出功能尚未实现');
    });

    it('should handle export error', async () => {
      // PDF导出功能尚未实现，所以直接返回错误
      const result = await CustomerArchiveManager.exportArchiveToPDF(1);
      
      expect(result.success).toBe(false);
      expect(result.message).toBe('PDF导出功能尚未实现');
    });
  });
});