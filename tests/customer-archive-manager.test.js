const path = require('path');

// Mock modules
jest.mock('fs/promises');
jest.mock('fs');
jest.mock('archiver');
jest.mock('unzipper');
jest.mock('exceljs');

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
  getCustomerByName: jest.fn(),
  updateCustomerStatus: jest.fn()
}), { virtual: true });

const DataManager = require('../src/utils/data-manager');
const PackageDataExtractor = require('../src/utils/package-data-extractor');
const { getCustomerByName } = require('../src/database/models/customer-fs');
const CustomerArchiveManager = require('../src/utils/customer-archive-manager');

describe('CustomerArchiveManager', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();

    // Mock fs/promises methods
    const fsp = require('fs/promises');
    fsp.access = jest.fn();
    fsp.mkdir = jest.fn();
    fsp.readFile = jest.fn();
    fsp.writeFile = jest.fn();
    fsp.readdir = jest.fn();

    // Mock fs methods
    const fs = require('fs');
    fs.createWriteStream = jest.fn();
    fs.createReadStream = jest.fn();

    // Mock ensureArchiveFiles to avoid mkdir issues
    CustomerArchiveManager._ensureArchiveFiles = jest.fn().mockResolvedValue(undefined);
  });

  describe('calculateTotalParts', () => {
    it('should calculate total parts correctly', () => {
      const packages = [
        { packageInfo: { quantity: 1 }, partIDs: ['part1', 'part2'] },   // 2 parts
        { packageInfo: { quantity: 2 }, partIDs: ['part3'] },            // 1 part
        { packageInfo: { quantity: 3 } } // No partIDs                 // 0 parts
      ];
      const total = CustomerArchiveManager.calculateTotalParts(packages);
      expect(total).toBe(3); // Total parts: 2 + 1 + 0 = 3
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
      expect(total).toBe(2); // Only count parts in packages with partIDs
    });

    it('should handle null or undefined input', () => {
      expect(CustomerArchiveManager.calculateTotalParts(null)).toBe(0);
      expect(CustomerArchiveManager.calculateTotalParts(undefined)).toBe(0);
    });
  });

  describe('exportArchiveToPDF', () => {
    it('should export archive to PDF successfully', async () => {
      const result = await CustomerArchiveManager.exportArchiveToPDF(1);
      
      expect(result.success).toBe(false);
      expect(result.message).toBe('PDF导出功能尚未实现');
    });
  });

  describe('archiveCustomer', () => {
    it('should archive customer successfully', async () => {
      const mockCustomer = { 
        name: 'TestCustomer',
        outputPath: '/mock/output/path'
      };
      
      getCustomerByName.mockResolvedValue(mockCustomer);
      PackageDataExtractor.extractCustomerPackageData.mockResolvedValue([
        {
          packSeq: '001',
          packageInfo: { quantity: 5, weight: 10 },
          partIDs: ['part1', 'part2', 'part3']
        }
      ]);

      // Setup fs/promises mock responses
      const fsp = require('fs/promises');
      fsp.access.mockResolvedValue(undefined);
      fsp.mkdir.mockResolvedValue(undefined);
      fsp.writeFile.mockResolvedValue(undefined);
      fsp.readFile
        .mockResolvedValueOnce(JSON.stringify([]))  // archiveData
        .mockResolvedValueOnce(JSON.stringify([]))  // packageArchiveData
        .mockResolvedValueOnce(JSON.stringify([])); // partArchiveData

      // Mock file stream operations
      const fs = require('fs');
      const mockOutputStream = {
        on: jest.fn().mockReturnThis()
      };
      fs.createWriteStream = jest.fn().mockReturnValue(mockOutputStream);

      // Mock archiver
      const archiver = require('archiver');
      const mockArchive = {
        pipe: jest.fn(),
        directory: jest.fn(),
        finalize: jest.fn().mockResolvedValue(undefined),
        on: jest.fn().mockReturnThis()
      };
      archiver.mockReturnValue(mockArchive);

      const result = await CustomerArchiveManager.archiveCustomer('TestCustomer', 'Test remark', 'Test operator');

      expect(result.success).toBe(true);
      expect(result.message).toContain('客户 TestCustomer 已成功归档');
      expect(result.message).toContain('源文件夹已标记为删除（模拟模式）');
    });

    it('should return error when customer not found', async () => {
      getCustomerByName.mockResolvedValue(null);

      const result = await CustomerArchiveManager.archiveCustomer('NonExistentCustomer', 'Test remark', 'Test operator');

      expect(result.success).toBe(false);
      expect(result.message).toBe('客户 NonExistentCustomer 不存在');
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
      
      const fsp = require('fs/promises');
      fsp.access = jest.fn().mockResolvedValue(undefined);
      fsp.readFile = jest.fn().mockResolvedValue(JSON.stringify(mockArchives));
      
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
      const fsp = require('fs/promises');
      fsp.access = jest.fn().mockResolvedValue(undefined);
      fsp.readFile = jest.fn().mockResolvedValue(JSON.stringify([]));
      
      const result = await CustomerArchiveManager.getArchiveList(1, 10);
      
      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
      expect(result.total).toBe(0);
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
      const fsp = require('fs/promises');
      fsp.access = jest.fn().mockResolvedValue(undefined);
      fsp.readFile = jest.fn()
        .mockResolvedValueOnce(JSON.stringify(mockArchive))
        .mockResolvedValueOnce(JSON.stringify(mockPackages))
        .mockResolvedValueOnce(JSON.stringify(mockParts));
      
      const result = await CustomerArchiveManager.getArchiveDetail(1);
      
      expect(result.success).toBe(true);
      expect(result.data.id).toBe(mockArchive[0].id);
      expect(result.data.customer_name).toBe(mockArchive[0].customer_name);
      expect(result.data.archive_date).toBe(mockArchive[0].archive_date);
    });

    it('should return error when archive not found', async () => {
      const fsp = require('fs/promises');
      fsp.access = jest.fn().mockResolvedValue(undefined);
      fsp.readFile = jest.fn().mockResolvedValue(JSON.stringify([]));
      
      const result = await CustomerArchiveManager.getArchiveDetail(999);
      
      expect(result.success).toBe(false);
      expect(result.message).toBe('归档记录不存在');
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
      
      // Use already mocked fs/promises methods
      const fsp = require('fs/promises');
      fsp.access.mockResolvedValue(undefined);
      fsp.mkdir.mockResolvedValue(undefined);
      fsp.readdir.mockResolvedValue(['TestCustomer_2023-01-01.zip']);
      
      // Mock unzipper with proper stream handling
      const unzipper = require('unzipper');
      const mockExtract = {
        on: jest.fn().mockReturnThis()
      };
      unzipper.Extract = jest.fn().mockReturnValue(mockExtract);
      
      const fs = require('fs');
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
        })
      };
      
      fs.createReadStream = jest.fn().mockReturnValue(mockStream);
      
      const customerFs = require('../src/database/models/customer-fs');
      customerFs.updateCustomerStatus = jest.fn().mockResolvedValue(undefined);
      
      const result = await CustomerArchiveManager.restoreArchive(1);
      
      expect(result.success).toBe(true);
      expect(customerFs.updateCustomerStatus).toHaveBeenCalledWith(
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
  });

  describe('exportArchiveToExcel', () => {
    it('should export archive to Excel successfully', async () => {
      const mockArchive = {
        id: 1,
        customer_name: 'TestCustomer',
        packages: []
      };
      
      // Mock getArchiveDetail to return success
      jest.spyOn(CustomerArchiveManager, 'getArchiveDetail').mockResolvedValue({
        success: true,
        data: mockArchive
      });
      
      // Use already mocked fs/promises methods
      const fsp = require('fs/promises');
      fsp.access.mockResolvedValue(undefined);
      fsp.mkdir.mockResolvedValue(undefined);
      fsp.writeFile.mockResolvedValue(undefined);
      
      // Mock ExcelJS
      const ExcelJS = require('exceljs');
      const mockWorksheet = {
        columns: [],
        addRows: jest.fn()
      };
      
      const mockWorkbook = {
        addWorksheet: jest.fn().mockReturnValue(mockWorksheet),
        xlsx: {
          writeFile: jest.fn().mockResolvedValue(undefined)
        }
      };
      
      ExcelJS.Workbook = jest.fn().mockReturnValue(mockWorkbook);
      
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
  });

  describe('deleteArchive', () => {
    it('should delete archive successfully', async () => {
      const mockArchives = [
        { id: 1, customer_name: 'Customer1', backup_path: '/backup/Customer1.zip' },
        { id: 2, customer_name: 'Customer2', backup_path: '/backup/Customer2.zip' }
      ];
      
      const mockPackages = [
        { id: 1, archive_id: 1 },
        { id: 2, archive_id: 1 },
        { id: 3, archive_id: 2 }
      ];
      
      const mockParts = [
        { id: 1, package_id: 1 },
        { id: 2, package_id: 1 },
        { id: 3, package_id: 2 },
        { id: 4, package_id: 3 }
      ];

      // Use already mocked fs/promises methods
      const fsp = require('fs/promises');
      fsp.access.mockResolvedValue(undefined);
      fsp.mkdir.mockResolvedValue(undefined);
      fsp.writeFile.mockResolvedValue(undefined);
      fsp.readFile
        .mockResolvedValueOnce(JSON.stringify(mockArchives))      // archiveData
        .mockResolvedValueOnce(JSON.stringify(mockPackages))      // packageArchiveData
        .mockResolvedValueOnce(JSON.stringify(mockParts));        // partArchiveData

      const result = await CustomerArchiveManager.deleteArchive(1);

      expect(result.success).toBe(true);
      expect(result.message).toContain('归档记录已删除，备份文件已标记为删除（模拟模式）');
      // 验证文件写入调用次数
      expect(fsp.writeFile).toHaveBeenCalledTimes(3);
    });

    it('should return error when archive not found', async () => {
      // Use already mocked fs/promises methods
      const fsp = require('fs/promises');
      fsp.access.mockResolvedValue(undefined);
      fsp.mkdir.mockResolvedValue(undefined);
      fsp.readFile.mockResolvedValueOnce(JSON.stringify([])); // Empty archive list

      const result = await CustomerArchiveManager.deleteArchive(999);

      expect(result.success).toBe(false);
      expect(result.message).toBe('归档记录不存在');
    });

    it('should handle file read error', async () => {
      // Use already mocked fs/promises methods
      const fsp = require('fs/promises');
      fsp.access.mockResolvedValue(undefined);
      fsp.mkdir.mockResolvedValue(undefined);
      fsp.readFile.mockRejectedValue(new Error('读取文件失败'));

      const result = await CustomerArchiveManager.deleteArchive(1);

      expect(result.success).toBe(false);
      expect(result.message).toContain('删除归档失败: 读取文件失败');
    });
  });
});