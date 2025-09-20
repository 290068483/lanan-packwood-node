const fs = require('fs').promises;
const path = require('path');
const archiver = require('archiver');
const unzipper = require('unzipper');

// Mock modules
jest.mock('fs/promises');
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
    // Clear all mocks
    jest.clearAllMocks();
    
    // Setup default mock behaviors
    getCustomerByName.mockResolvedValue(mockCustomerData);
    PackageDataExtractor.extractCustomerPackageData.mockReturnValue(mockPackagesData);
    
    // Mock file system operations
    fs.access = jest.fn().mockResolvedValue();
    fs.mkdir = jest.fn().mockResolvedValue(undefined);
    fs.readFile = jest.fn();
    fs.readFile.mockImplementation(async (filePath) => {
      if (filePath.includes('archive.json')) {
        return JSON.stringify([]);
      } else if (filePath.includes('package-archive.json')) {
        return JSON.stringify([]);
      } else if (filePath.includes('part-archive.json')) {
        return JSON.stringify([]);
      }
      return '[]';
    });
    
    fs.writeFile = jest.fn().mockResolvedValue(undefined);
    fs.rm = jest.fn().mockResolvedValue(undefined);
    fs.createWriteStream = jest.fn();
    fs.createReadStream = jest.fn();
  });

  describe('archiveCustomer', () => {
    it('should archive customer successfully', async () => {
      // Mock archive creation
      const mockOutputStream = {
        on: jest.fn((event, callback) => {
          if (event === 'close') {
            setTimeout(callback, 0);
          }
          return mockOutputStream;
        })
      };
      fs.createWriteStream.mockReturnValue(mockOutputStream);
      
      const mockArchive = {
        pipe: jest.fn(),
        directory: jest.fn(),
        finalize: jest.fn(),
        on: jest.fn((event, callback) => {
          if (event === 'error') {
            // Do nothing
          }
          return mockArchive;
        })
      };
      archiver.mockReturnValue(mockArchive);
      
      const result = await CustomerArchiveManager.archiveCustomer(
        mockCustomerName,
        'testOperator',
        'test remark'
      );
      
      expect(result.success).toBe(true);
      expect(getCustomerByName).toHaveBeenCalledWith(mockCustomerName);
      expect(DataManager.updateCustomerStatus).toHaveBeenCalledWith(
        mockCustomerName,
        '已归档',
        expect.stringContaining('已归档到'),
        'testOperator'
      );
    });

    it('should return error when customer does not exist', async () => {
      getCustomerByName.mockResolvedValue(null);
      
      const result = await CustomerArchiveManager.archiveCustomer(
        'NonExistentCustomer',
        'testOperator',
        'test remark'
      );
      
      expect(result.success).toBe(false);
      expect(result.message).toContain('客户不存在');
    });

    it('should handle packages.json read error gracefully', async () => {
      // Mock console.warn
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      // 模拟 fs.access 抛出错误，触发 packages.json 读取失败
      fs.access.mockImplementation(async (filePath) => {
        if (filePath && filePath.includes && filePath.includes('packages.json')) {
          throw new Error('File not found');
        }
        // 对于其他文件，正常返回
        return Promise.resolve();
      });
      
      const mockOutputStream = {
        on: jest.fn((event, callback) => {
          if (event === 'close') {
            setTimeout(callback, 0);
          }
          return mockOutputStream;
        })
      };
      fs.createWriteStream.mockReturnValue(mockOutputStream);
      
      const mockArchive = {
        pipe: jest.fn(),
        directory: jest.fn(),
        finalize: jest.fn(),
        on: jest.fn((event, callback) => {
          if (event === 'error') {
            // Do nothing
          }
          return mockArchive;
        })
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
      const total = CustomerArchiveManager.calculateTotalParts(mockPackagesData);
      expect(total).toBe(5); // 3 parts + 2 parts
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
      expect(total).toBe(2);
    });
  });

  describe('getArchiveList', () => {
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
  });

  describe('getArchiveDetail', () => {
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

    it('should handle file read error', async () => {
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
  });

  describe('restoreArchive', () => {
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
      
      // Mock unzipper
      const mockExtract = {
        promise: jest.fn().mockResolvedValue(Promise.resolve())
      };
      unzipper.Extract = jest.fn().mockReturnValue(mockExtract);
      
      const mockReadStream = {
        pipe: jest.fn().mockReturnValue({
          promise: jest.fn().mockResolvedValue(Promise.resolve())
        })
      };
      fs.createReadStream.mockReturnValue(mockReadStream);
      
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
      
      fs.createReadStream.mockImplementation(() => {
        throw new Error('Read stream error');
      });
      
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
  });

  describe('exportArchiveToPDF', () => {
    it('should export archive to PDF successfully', async () => {
      const mockArchive = {
        id: 1,
        customer_name: 'TestCustomer'
      };
      
      // Mock getArchiveDetail to return success
      jest.spyOn(CustomerArchiveManager, 'getArchiveDetail').mockResolvedValue({
        success: true,
        data: mockArchive
      });
      
      const result = await CustomerArchiveManager.exportArchiveToPDF(1);
      
      expect(result.success).toBe(true);
      expect(result.filePath).toContain('归档_TestCustomer_');
      expect(result.filePath).toContain('.pdf');
    });

    it('should return error when archive detail retrieval fails', async () => {
      jest.spyOn(CustomerArchiveManager, 'getArchiveDetail').mockResolvedValue({
        success: false,
        message: 'Archive not found'
      });
      
      const result = await CustomerArchiveManager.exportArchiveToPDF(999);
      
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
      
      const result = await CustomerArchiveManager.exportArchiveToPDF(1);
      
      expect(result.success).toBe(false);
      expect(result.message).toContain('导出归档到PDF失败');
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '导出归档到PDF失败:',
        expect.any(Error)
      );
      
      consoleErrorSpy.mockRestore();
    });
  });
});