/**
 * 出货功能单元测试
 * 测试出货功能是否正确更新出货状态而不是客户状态
 */

const path = require('path');
const fs = require('fs');

// 模拟Electron环境
global.process = {
    ...process,
    resourcesPath: __dirname
};

// 导入被测试的模块
const DataManager = require('../utils/data-manager');

// 测试数据目录
const testDataDir = path.join(__dirname, '../data');
const testCustomerDataPath = path.join(testDataDir, 'customers.json');
const testPanelDataPath = path.join(testDataDir, 'panels.json');
const testHistoryDataPath = path.join(testDataDir, 'history.json');

// 测试客户数据
const testCustomer = {
    name: '测试客户',
    status: 'active',
    packProgress: 0,
    packedCount: 0,
    totalParts: 0,
    packSeqs: [],
    lastUpdate: new Date().toISOString(),
    packDate: null,
    archiveDate: null,
    shipmentDate: null,
    shipmentStatus: null,
    shipmentRemark: null,
    shipmentInfo: null,
    statusHistory: [],
    replacementStatus: 'none',
    replacementHistory: [],
    panels: [],
    outputPath: null
};

describe('出货功能测试', () => {

    beforeEach(async () => {
        // 确保测试数据目录存在
        if (!fs.existsSync(testDataDir)) {
            fs.mkdirSync(testDataDir, { recursive: true });
        }

        // 初始化测试数据文件
        fs.writeFileSync(testCustomerDataPath, JSON.stringify([]));
        fs.writeFileSync(testPanelDataPath, JSON.stringify([]));
        fs.writeFileSync(testHistoryDataPath, JSON.stringify([]));

        // 创建测试客户
        await DataManager.upsertCustomer(testCustomer);
    });

    afterEach(() => {
        // 清理测试数据
        if (fs.existsSync(testCustomerDataPath)) {
            fs.unlinkSync(testCustomerDataPath);
        }
        if (fs.existsSync(testPanelDataPath)) {
            fs.unlinkSync(testPanelDataPath);
        }
        if (fs.existsSync(testHistoryDataPath)) {
            fs.unlinkSync(testHistoryDataPath);
        }
    });

    it('出货功能应该只更新出货状态，不改变客户状态', async () => {
        // 获取初始客户数据
        const initialCustomer = await DataManager.getCustomer(testCustomer.name);
        const initialStatus = initialCustomer.status;

        // 执行出货操作
        const shippingInfo = {
            remark: '测试出货',
            trackingNumber: 'TN123456789'
        };

        const result = await DataManager.updateCustomerShipment(testCustomer.name, shippingInfo);

        // 验证出货操作成功
        expect(result).toBe(true);

        // 获取更新后的客户数据
        const updatedCustomer = await DataManager.getCustomer(testCustomer.name);

        // 验证客户状态没有被改变
        expect(updatedCustomer.status).toBe(initialStatus);

        // 验证出货相关字段被正确更新
        expect(updatedCustomer.shipmentDate).not.toBeNull();
        expect(updatedCustomer.shipmentStatus).toBe('shipped');
        expect(updatedCustomer.shipmentRemark).toBe('测试出货');
        expect(updatedCustomer.shipmentInfo).toEqual(shippingInfo);
    });

    it('出货功能应该记录出货历史', async () => {
        // 执行出货操作
        const shippingInfo = {
            remark: '测试出货历史记录',
            trackingNumber: 'TN987654321'
        };

        await DataManager.updateCustomerShipment(testCustomer.name, shippingInfo);

        // 读取历史数据
        const historyData = JSON.parse(fs.readFileSync(testHistoryDataPath, 'utf8'));

        // 验证出货历史记录存在
        const shipmentHistory = historyData.find(h => h.type === 'shipment');
        expect(shipmentHistory).toBeDefined();
        expect(shipmentHistory.status).toBe('shipped');
        expect(shipmentHistory.remark).toBe('测试出货历史记录');
        expect(shipmentHistory.operator).toBe('system');
    });

    it('出货功能应该处理不存在的客户', async () => {
        const result = await DataManager.updateCustomerShipment('不存在的客户', {});
        expect(result).toBe(false);
    });

    it('出货功能应该处理默认值', async () => {
        // 执行出货操作，不提供remark
        const result = await DataManager.updateCustomerShipment(testCustomer.name, {});

        // 验证出货操作成功
        expect(result).toBe(true);

        // 获取更新后的客户数据
        const updatedCustomer = await DataManager.getCustomer(testCustomer.name);

        // 验证默认值被正确设置
        expect(updatedCustomer.shipmentRemark).toBe('已发货');
        expect(updatedCustomer.shipmentInfo).toEqual({});
    });
});