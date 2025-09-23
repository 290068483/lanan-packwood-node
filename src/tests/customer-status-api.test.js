/**
 * 客户状态API测试
 */

const request = require('supertest');
const express = require('express');
const customerStatusApi = require('../api/customer-status-api');
const customerStatusManager = require('../utils/customer-status-manager');
const DataManager = require('../utils/data-manager');
const PackageDataExtractor = require('../utils/package-data-extractor');
const { logInfo, logError, logWarning, logSuccess } = require('../utils/logger');

// Mock依赖项
jest.mock('../utils/customer-status-manager');
jest.mock('../utils/data-manager');
jest.mock('../utils/package-data-extractor');
jest.mock('../utils/logger');
jest.mock('fs');

const fs = require('fs');

// 创建Express应用用于测试
const app = express();
app.use(express.json());
app.use('/api/customers', customerStatusApi);

describe('Customer Status API', () => {
    const mockCustomer = {
        id: 1,
        name: '测试客户',
        status: '已打包',
        outputPath: '/path/to/customer',
        statusHistory: []
    };

    const mockStatusInfo = {
        status: '已打包',
        packedCount: 10,
        totalParts: 15,
        packProgress: 66.67,
        packSeqs: ['PKG001', 'PKG002'],
        timestamp: new Date().toISOString()
    };

    const mockPackagesData = [
        {
            packSeq: 'PKG001',
            partIDs: ['PART001', 'PART002'],
            packageInfo: { weight: 10.5 }
        }
    ];

    beforeEach(() => {
        // 重置所有mock
        jest.clearAllMocks();

        // 设置默认的mock返回值
        DataManager.getCustomer.mockResolvedValue(mockCustomer);
        DataManager.upsertCustomer.mockResolvedValue(true);
        PackageDataExtractor.extractCustomerPackageData.mockReturnValue(mockPackagesData);
        customerStatusManager.checkPackStatus.mockReturnValue(mockStatusInfo);
        customerStatusManager.updateCustomerStatus.mockReturnValue(mockCustomer);
        customerStatusManager.archiveCustomer.mockReturnValue({
            ...mockCustomer,
            status: 'ARCHIVED',
            archiveDate: new Date().toISOString()
        });
        customerStatusManager.shipCustomer.mockReturnValue({
            ...mockCustomer,
            status: 'SHIPPED',
            shipmentDate: new Date().toISOString()
        });
        customerStatusManager.partialShipCustomer.mockReturnValue({
            ...mockCustomer,
            status: 'PARTIALLY_SHIPPED',
            shipmentDate: new Date().toISOString()
        });
        customerStatusManager.markCustomerNotShipped.mockReturnValue({
            ...mockCustomer,
            status: 'NOT_SHIPPED'
        });

        // Mock fs.existsSync
        fs.existsSync = jest.fn().mockReturnValue(true);
    });

    describe('POST /api/customers/:id/check-status', () => {
        it('应该成功检查客户状态', async () => {
            const response = await request(app)
                .post('/api/customers/测试客户/check-status')
                .send();

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.status).toBe(mockStatusInfo.status);
            expect(response.body.packedCount).toBe(mockStatusInfo.packedCount);
            expect(response.body.totalParts).toBe(mockStatusInfo.totalParts);
            expect(response.body.packProgress).toBe(mockStatusInfo.packProgress);
            expect(response.body.packSeqs).toEqual(mockStatusInfo.packSeqs);

            expect(DataManager.getCustomer).toHaveBeenCalledWith('测试客户');
            expect(customerStatusManager.checkPackStatus).toHaveBeenCalledWith(mockCustomer, mockPackagesData);
            expect(customerStatusManager.updateCustomerStatus).toHaveBeenCalled();
            expect(DataManager.upsertCustomer).toHaveBeenCalled();
            expect(logSuccess).toHaveBeenCalled();
        });

        it('客户不存在时应该返回404错误', async () => {
            DataManager.getCustomer.mockResolvedValue(null);

            const response = await request(app)
                .post('/api/customers/不存在的客户/check-status')
                .send();

            expect(response.status).toBe(404);
            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe('客户不存在');

            expect(logError).toHaveBeenCalled();
        });

        it('发生错误时应该返回500错误', async () => {
            DataManager.getCustomer.mockRejectedValue(new Error('数据库错误'));

            const response = await request(app)
                .post('/api/customers/测试客户/check-status')
                .send();

            expect(response.status).toBe(500);
            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe('数据库错误');

            expect(logError).toHaveBeenCalled();
        });
    });

    describe('POST /api/customers/:id/archive', () => {
        it('应该成功归档客户', async () => {
            const response = await request(app)
                .post('/api/customers/测试客户/archive')
                .send({ remark: '测试归档' });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.status).toBe('ARCHIVED');
            expect(response.body.archiveDate).toBeDefined();
            expect(response.body.message).toBe('客户归档成功');

            expect(customerStatusManager.archiveCustomer).toHaveBeenCalledWith(
                mockCustomer,
                'API',
                '测试归档'
            );
            expect(DataManager.upsertCustomer).toHaveBeenCalled();
            expect(logSuccess).toHaveBeenCalled();
        });

        it('客户状态不允许归档时应该返回400错误', async () => {
            const invalidCustomer = { ...mockCustomer, status: '新建' };
            DataManager.getCustomer.mockResolvedValue(invalidCustomer);

            const response = await request(app)
                .post('/api/customers/测试客户/archive')
                .send();

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
            expect(response.body.message).toContain('只有已打包的客户才能进行归档');
        });

        it('客户不存在时应该返回404错误', async () => {
            DataManager.getCustomer.mockResolvedValue(null);

            const response = await request(app)
                .post('/api/customers/不存在的客户/archive')
                .send();

            expect(response.status).toBe(404);
            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe('客户不存在');
        });
    });

    describe('POST /api/customers/:id/ship', () => {
        it('应该成功出货客户', async () => {
            const response = await request(app)
                .post('/api/customers/测试客户/ship')
                .send({ remark: '测试出货' });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.status).toBe('SHIPPED');
            expect(response.body.shipmentDate).toBeDefined();
            expect(response.body.message).toBe('客户出货成功');

            expect(customerStatusManager.shipCustomer).toHaveBeenCalledWith(
                mockCustomer,
                'API',
                '测试出货'
            );
            expect(DataManager.upsertCustomer).toHaveBeenCalled();
            expect(logSuccess).toHaveBeenCalled();
        });

        it('客户状态不允许出货时应该返回400错误', async () => {
            const invalidCustomer = { ...mockCustomer, status: '新建' };
            DataManager.getCustomer.mockResolvedValue(invalidCustomer);

            const response = await request(app)
                .post('/api/customers/测试客户/ship')
                .send();

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
            expect(response.body.message).toContain('只有已打包或正在处理的客户才能进行出货');
        });
    });

    describe('POST /api/customers/:id/partial-ship', () => {
        it('应该成功部分出货客户', async () => {
            const response = await request(app)
                .post('/api/customers/测试客户/partial-ship')
                .send({ remark: '测试部分出货' });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.status).toBe('PARTIALLY_SHIPPED');
            expect(response.body.shipmentDate).toBeDefined();
            expect(response.body.message).toBe('客户部分出货成功');

            expect(customerStatusManager.partialShipCustomer).toHaveBeenCalledWith(
                mockCustomer,
                'API',
                '测试部分出货'
            );
            expect(DataManager.upsertCustomer).toHaveBeenCalled();
            expect(logSuccess).toHaveBeenCalled();
        });

        it('客户状态不允许部分出货时应该返回400错误', async () => {
            const invalidCustomer = { ...mockCustomer, status: '新建' };
            DataManager.getCustomer.mockResolvedValue(invalidCustomer);

            const response = await request(app)
                .post('/api/customers/测试客户/partial-ship')
                .send();

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
            expect(response.body.message).toContain('只有已打包或正在处理的客户才能进行部分出货');
        });
    });

    describe('POST /api/customers/:id/mark-not-shipped', () => {
        it('应该成功标记客户为未出货', async () => {
            const response = await request(app)
                .post('/api/customers/测试客户/mark-not-shipped')
                .send({ remark: '测试标记为未出货' });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.status).toBe('NOT_SHIPPED');
            expect(response.body.message).toBe('客户已标记为未出货');

            expect(customerStatusManager.markCustomerNotShipped).toHaveBeenCalledWith(
                mockCustomer,
                'API',
                '测试标记为未出货'
            );
            expect(DataManager.upsertCustomer).toHaveBeenCalled();
            expect(logSuccess).toHaveBeenCalled();
        });

        it('客户状态不允许标记为未出货时应该返回400错误', async () => {
            const invalidCustomer = { ...mockCustomer, status: '新建' };
            DataManager.getCustomer.mockResolvedValue(invalidCustomer);

            const response = await request(app)
                .post('/api/customers/测试客户/mark-not-shipped')
                .send();

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
            expect(response.body.message).toContain('只有已打包或正在处理的客户才能标记为未出货');
        });
    });

    describe('GET /api/customers/:id/status-history', () => {
        it('应该成功获取客户状态历史', async () => {
            const customerWithHistory = {
                ...mockCustomer,
                statusHistory: [
                    { status: '新建', timestamp: '2023-01-01T00:00:00Z', user: 'user1' },
                    { status: '已打包', timestamp: '2023-01-02T00:00:00Z', user: 'user2' }
                ]
            };
            DataManager.getCustomer.mockResolvedValue(customerWithHistory);

            const response = await request(app)
                .get('/api/customers/测试客户/status-history');

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.statusHistory).toEqual(customerWithHistory.statusHistory);
            expect(response.body.statusHistory).toHaveLength(2);
        });

        it('客户没有状态历史时应该返回空数组', async () => {
            const response = await request(app)
                .get('/api/customers/测试客户/status-history');

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.statusHistory).toEqual([]);
        });

        it('客户不存在时应该返回404错误', async () => {
            DataManager.getCustomer.mockResolvedValue(null);

            const response = await request(app)
                .get('/api/customers/不存在的客户/status-history');

            expect(response.status).toBe(404);
            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe('客户不存在');

            expect(logError).toHaveBeenCalled();
        });
    });
});