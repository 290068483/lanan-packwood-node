/**
 * 客户归档管理器测试
 */

const fs = require('fs').promises;
const fss = require('fs');
const path = require('path');
const CustomerArchiveManager = require('../utils/customer-archive-manager');

// Mock文件系统操作
jest.mock('fs');
jest.mock('fs').promises;
jest.mock('archiver');
jest.mock('unzipper');
jest.mock('../database/models/customer-fs');
jest.mock('./package-data-extractor');
jest.mock('./data-manager');

const mockCustomerModel = require('../database/models/customer-fs');
const mockPackageDataExtractor = require('./package-data-extractor');
const mockArchiver = require('archiver');
const mockUnzipper = require('unzipper');

describe('CustomerArchiveManager', () => {
    const mockCustomer = {
        id: 1,
        name: '测试客户',
        address: '测试地址',
        outputPath: '/path/to/customer',
        status: '已打包'
    };

    const mockPackagesData = [
        {
            packSeq: 'PKG001',
            partIDs: ['PART001', 'PART002'],
            packageInfo: { weight: 10.5 }
        },
        {
            packSeq: 'PKG002',
            partIDs: ['PART003'],
            packageInfo: { weight: 8.0 }
        }
    ];

    beforeEach(() => {
        // 重置所有mock
        jest.clearAllMocks();

        // 设置默认的mock返回值
        mockCustomerModel.getCustomerByName.mockResolvedValue(mockCustomer);
        mockCustomerModel.updateCustomerStatus.mockResolvedValue(true);
        mockPackageDataExtractor.extractCustomerPackageData.mockResolvedValue(mockPackagesData);

        // Mock fs.promises
        fs.mkdir = jest.fn().mockResolvedValue();
        fs.access = jest.fn().mockRejectedValue(new Error('File not found'));
        fs.writeFile = jest.fn().mockResolvedValue();
        fs.readFile = jest.fn().mockResolvedValue('[]');
        fs.stat = jest.fn().mockResolvedValue({ size: 1024 });
        fs.readdir = jest.fn().mockResolvedValue([]);
        fs.unlink = jest.fn().mockResolvedValue();

        // Mock fs
        fss.createWriteStream = jest.fn().mockReturnValue({
            on: jest.fn().mockReturnThis(),
            close: jest.fn()
        });
        fss.createReadStream = jest.fn().mockReturnValue({
            pipe: jest.fn().mockReturnThis(),
            on: jest.fn().mockReturnThis()
        });

        // Mock archiver
        const mockArchiveInstance = {
            pipe: jest.fn(),
            directory: jest.fn(),
            finalize: jest.fn(),
            on: jest.fn().mockImplementation((event, callback) => {
                if (event === 'close') callback();
                return mockArchiveInstance;
            }),
            pointer: jest.fn().mockReturnValue(1024)
        };
        mockArchiver.mockReturnValue(mockArchiveInstance);

        // Mock unzipper
        mockUnzipper.Parse = jest.fn().mockReturnValue({
            on: jest.fn().mockReturnThis()
        });
        mockUnzipper.Extract = jest.fn().mockReturnValue({
            on: jest.fn().mockImplementation((event, callback) => {
                if (event === 'close') callback();
                return { on: jest.fn().mockReturnThis() };
            })
        });
    });

    describe('calculateTotalParts', () => {
        it('应该正确计算总部件数', () => {
            const packages = [
                { partIDs: ['PART001', 'PART002'] },
                { partIDs: ['PART003'] },
                { partIDs: [] },
                { partIDs: ['PART004', 'PART005', 'PART006'] }
            ];

            const result = CustomerArchiveManager.calculateTotalParts(packages);
            expect(result).toBe(6);
        });

        it('空数组应该返回0', () => {
            const result = CustomerArchiveManager.calculateTotalParts([]);
            expect(result).toBe(0);
        });

        it('null或undefined应该返回0', () => {
            expect(CustomerArchiveManager.calculateTotalParts(null)).toBe(0);
            expect(CustomerArchiveManager.calculateTotalParts(undefined)).toBe(0);
        });
    });

    describe('getArchiveList', () => {
        it('应该返回分页的归档列表', async () => {
            const mockArchives = [
                { id: 1, customer_name: '客户1', archive_date: '2023-01-02' },
                { id: 2, customer_name: '客户2', archive_date: '2023-01-01' }
            ];
            fs.readFile.mockResolvedValue(JSON.stringify(mockArchives));

            const result = await CustomerArchiveManager.getArchiveList(1, 10);

            expect(result.success).toBe(true);
            expect(result.data).toHaveLength(2);
            expect(result.total).toBe(2);
        });

        it('应该正确处理空列表', async () => {
            fs.readFile.mockResolvedValue('[]');

            const result = await CustomerArchiveManager.getArchiveList();

            expect(result.success).toBe(true);
            expect(result.data).toHaveLength(0);
            expect(result.total).toBe(0);
        });
    });

    describe('deleteArchive', () => {
        it('应该成功删除归档记录', async () => {
            const mockArchiveRecord = {
                id: 1,
                customer_name: '测试客户',
                backup_path: '/path/to/backup.zip'
            };

            fs.readFile.mockImplementation((filePath) => {
                if (filePath.includes('archive.json')) {
                    return Promise.resolve(JSON.stringify([mockArchiveRecord]));
                }
                return Promise.resolve('[]');
            });

            const result = await CustomerArchiveManager.deleteArchive(1);

            expect(result.success).toBe(true);
            expect(fs.writeFile).toHaveBeenCalledTimes(3);
        });

        it('归档记录不存在时应该返回错误', async () => {
            fs.readFile.mockResolvedValue('[]');

            const result = await CustomerArchiveManager.deleteArchive(999);

            expect(result.success).toBe(false);
            expect(result.message).toBe('归档记录不存在');
        });
    });

    describe('exportArchiveToPDF', () => {
        it('应该返回功能未实现的提示', async () => {
            const result = await CustomerArchiveManager.exportArchiveToPDF(1);

            expect(result.success).toBe(false);
            expect(result.message).toBe('PDF导出功能尚未实现');
        });
    });

    describe('archiveCustomer', () => {
        it('应该成功归档客户', async () => {
            const result = await CustomerArchiveManager.archiveCustomer('测试客户');

            expect(result.success).toBe(true);
            expect(result.message).toContain('归档成功');
            expect(mockCustomerModel.updateCustomerStatus).toHaveBeenCalledWith('测试客户', 'ARCHIVED');
        });

        it('客户不存在时应该返回错误', async () => {
            mockCustomerModel.getCustomerByName.mockResolvedValue(null);

            const result = await CustomerArchiveManager.archiveCustomer('不存在的客户');

            expect(result.success).toBe(false);
            expect(result.message).toBe('客户不存在');
        });

        it('创建备份文件失败时应该返回错误', async () => {
            const mockArchiveInstance = {
                pipe: jest.fn(),
                directory: jest.fn(),
                finalize: jest.fn(),
                on: jest.fn().mockImplementation((event, callback) => {
                    if (event === 'error') callback(new Error('创建备份失败'));
                    return mockArchiveInstance;
                })
            };
            mockArchiver.mockReturnValue(mockArchiveInstance);

            const result = await CustomerArchiveManager.archiveCustomer('测试客户');

            expect(result.success).toBe(false);
            expect(result.message).toContain('创建备份失败');
        });
    });

    describe('getArchiveDetail', () => {
        it('应该返回归档详情', async () => {
            const mockArchiveRecord = {
                id: 1,
                customer_name: '测试客户',
                archive_date: '2023-01-01',
                total_parts: 3,
                total_packages: 2
            };

            fs.readFile.mockImplementation((filePath) => {
                if (filePath.includes('archive.json')) {
                    return Promise.resolve(JSON.stringify([mockArchiveRecord]));
                }
                if (filePath.includes('packages.json')) {
                    return Promise.resolve(JSON.stringify(mockPackagesData));
                }
                return Promise.resolve('[]');
            });

            const result = await CustomerArchiveManager.getArchiveDetail(1);

            expect(result.success).toBe(true);
            expect(result.data).toEqual(mockArchiveRecord);
            expect(result.packages).toEqual(mockPackagesData);
        });

        it('归档记录不存在时应该返回错误', async () => {
            fs.readFile.mockResolvedValue('[]');

            const result = await CustomerArchiveManager.getArchiveDetail(999);

            expect(result.success).toBe(false);
            expect(result.message).toBe('归档记录不存在');
        });
    });

    describe('restoreArchive', () => {
        it('应该成功恢复归档', async () => {
            const mockArchiveRecord = {
                id: 1,
                customer_name: '测试客户',
                backup_path: '/path/to/backup.zip'
            };

            fs.readFile.mockImplementation((filePath) => {
                if (filePath.includes('archive.json')) {
                    return Promise.resolve(JSON.stringify([mockArchiveRecord]));
                }
                return Promise.resolve('[]');
            });

            fs.access.mockResolvedValue();

            const result = await CustomerArchiveManager.restoreArchive(1);

            expect(result.success).toBe(true);
            expect(result.message).toContain('恢复成功');
            expect(mockCustomerModel.updateCustomerStatus).toHaveBeenCalledWith('测试客户', '已打包');
        });

        it('备份文件不存在时应该返回错误', async () => {
            const mockArchiveRecord = {
                id: 1,
                customer_name: '测试客户',
                backup_path: '/path/to/backup.zip'
            };

            fs.readFile.mockImplementation((filePath) => {
                if (filePath.includes('archive.json')) {
                    return Promise.resolve(JSON.stringify([mockArchiveRecord]));
                }
                return Promise.resolve('[]');
            });

            fs.access.mockRejectedValue(new Error('File not found'));

            const result = await CustomerArchiveManager.restoreArchive(1);

            expect(result.success).toBe(false);
            expect(result.message).toBe('备份文件不存在');
        });

        it('解压失败时应该返回错误', async () => {
            const mockArchiveRecord = {
                id: 1,
                customer_name: '测试客户',
                backup_path: '/path/to/backup.zip'
            };

            fs.readFile.mockImplementation((filePath) => {
                if (filePath.includes('archive.json')) {
                    return Promise.resolve(JSON.stringify([mockArchiveRecord]));
                }
                return Promise.resolve('[]');
            });

            fs.access.mockResolvedValue();

            const mockExtract = {
                on: jest.fn().mockImplementation((event, callback) => {
                    if (event === 'error') callback(new Error('解压失败'));
                    return { on: jest.fn().mockReturnThis() };
                })
            };
            mockUnzipper.Extract.mockReturnValue(mockExtract);

            const result = await CustomerArchiveManager.restoreArchive(1);

            expect(result.success).toBe(false);
            expect(result.message).toContain('解压失败');
        });
    });

    describe('exportArchiveToExcel', () => {
        it('应该成功导出Excel文件', async () => {
            const mockArchiveRecord = {
                id: 1,
                customer_name: '测试客户',
                archive_date: '2023-01-01',
                total_parts: 3,
                total_packages: 2
            };

            fs.readFile.mockImplementation((filePath) => {
                if (filePath.includes('archive.json')) {
                    return Promise.resolve(JSON.stringify([mockArchiveRecord]));
                }
                if (filePath.includes('packages.json')) {
                    return Promise.resolve(JSON.stringify(mockPackagesData));
                }
                return Promise.resolve('[]');
            });

            const result = await CustomerArchiveManager.exportArchiveToExcel(1);

            expect(result.success).toBe(true);
            expect(result.message).toContain('Excel导出成功');
        });

        it('归档记录不存在时应该返回错误', async () => {
            fs.readFile.mockResolvedValue('[]');

            const result = await CustomerArchiveManager.exportArchiveToExcel(999);

            expect(result.success).toBe(false);
            expect(result.message).toBe('归档记录不存在');
        });
    });
});