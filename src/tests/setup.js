// 测试环境设置文件

// 设置测试环境变量
process.env.NODE_ENV = 'test';

// 全局测试超时设置
jest.setTimeout(10000);

// 在所有测试之前运行
beforeAll(() => {
    // 可以在这里设置全局的测试数据或配置
    console.log('测试环境初始化...');
});

// 在所有测试之后运行
afterAll(() => {
    // 清理测试数据
    console.log('测试环境清理...');
});

// 在每个测试文件之前运行
beforeEach(() => {
    // 重置测试状态
    jest.clearAllMocks();
    jest.resetModules();
});

// 在每个测试文件之后运行
afterEach(() => {
    // 清理测试数据
    jest.clearAllMocks();
});

// 全局测试工具函数
global.testUtils = {
    // 创建测试客户数据
    createTestCustomer: (overrides = {}) => ({
        name: '测试客户',
        address: '测试地址',
        phone: '1234567890',
        email: 'test@example.com',
        panels: [
            { id: 'panel1', name: '面板1' },
            { id: 'panel2', name: '面板2' }
        ],
        ...overrides
    }),

    // 创建测试面板数据
    createTestPanel: (overrides = {}) => ({
        id: 'test-panel-id',
        name: '测试面板',
        customerId: 'test-customer-id',
        customerName: '测试客户',
        ...overrides
    }),

    // 创建测试包数据
    createTestPackage: (overrides = {}) => ({
        packSeq: 'test-pack-seq',
        packNo: '001',
        packDate: '2023-01-01',
        partIDs: ['panel1', 'panel2'],
        ...overrides
    }),

    // 等待异步操作完成
    sleep: (ms) => new Promise(resolve => setTimeout(resolve, ms)),

    // 清理测试文件
    cleanupTestFiles: (filePaths) => {
        const fs = require('fs');
        filePaths.forEach(filePath => {
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        });
    }
};

// 模拟console.error以避免测试输出中的错误信息
jest.spyOn(console, 'error').mockImplementation(() => { });

// 模拟console.log以减少测试输出
jest.spyOn(console, 'log').mockImplementation(() => { });

// 设置全局的测试期望扩展
expect.extend({
    // 自定义匹配器：检查对象是否有特定的状态字段
    toHaveCustomerStatus(received, expectedStatus) {
        const pass = received.status === expectedStatus;
        return {
            message: () => `期望客户状态为 ${expectedStatus}，但实际为 ${received.status}`,
            pass
        };
    },

    // 自定义匹配器：检查对象是否有特定的出货状态字段
    toHaveShipmentStatus(received, expectedShipmentStatus) {
        const pass = received.shipmentStatus === expectedShipmentStatus;
        return {
            message: () => `期望出货状态为 ${expectedShipmentStatus}，但实际为 ${received.shipmentStatus}`,
            pass
        };
    }
});