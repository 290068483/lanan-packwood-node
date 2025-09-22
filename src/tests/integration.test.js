const { expect } = require('chai');
const sinon = require('sinon');
const fs = require('fs');
const path = require('path');
const customerStatusManager = require('../utils/customer-status-manager');
const customerFS = require('../database/models/customer-fs');

describe('客户状态双系统集成测试', () => {
    let customerFSInstance;
    let mockDataPath;
    let mockPanelsPath;
    let mockHistoryPath;
    let sandbox;

    beforeEach(() => {
        sandbox = sinon.createSandbox();

        // 创建临时文件路径
        mockDataPath = path.join(__dirname, '../../data/test-integration-database.json');
        mockPanelsPath = path.join(__dirname, '../../data/test-integration-panels.json');
        mockHistoryPath = path.join(__dirname, '../../data/test-integration-history.json');

        // 确保测试目录存在
        const testDir = path.dirname(mockDataPath);
        if (!fs.existsSync(testDir)) {
            fs.mkdirSync(testDir, { recursive: true });
        }

        // 创建CustomerFS实例并覆盖文件路径
        customerFSInstance = new customerFS.constructor();
        customerFSInstance.dataPath = mockDataPath;
        customerFSInstance.panelsPath = mockPanelsPath;
        customerFSInstance.historyPath = mockHistoryPath;

        // 清理测试文件
        if (fs.existsSync(mockDataPath)) fs.unlinkSync(mockDataPath);
        if (fs.existsSync(mockPanelsPath)) fs.unlinkSync(mockPanelsPath);
        if (fs.existsSync(mockHistoryPath)) fs.unlinkSync(mockHistoryPath);
    });

    afterEach(() => {
        sandbox.restore();

        // 清理测试文件
        if (fs.existsSync(mockDataPath)) fs.unlinkSync(mockDataPath);
        if (fs.existsSync(mockPanelsPath)) fs.unlinkSync(mockPanelsPath);
        if (fs.existsSync(mockHistoryPath)) fs.unlinkSync(mockHistoryPath);
    });

    describe('客户创建和初始状态', () => {
        it('应该正确创建客户并设置初始双状态', () => {
            const customerData = {
                name: '集成测试客户',
                address: '测试地址',
                phone: '1234567890',
                panels: [
                    { id: 'panel1', name: '面板1' },
                    { id: 'panel2', name: '面板2' },
                    { id: 'panel3', name: '面板3' }
                ]
            };

            const customer = customerFSInstance.createOrUpdateCustomer(customerData, '测试用户');

            // 验证初始状态
            expect(customer.status).to.equal(customerStatusManager.STATUS.NOT_PACKED);
            expect(customer.shipmentStatus).to.equal(customerStatusManager.SHIPMENT_STATUS.NOT_SHIPPED);
            expect(customer.packProgress).to.equal(0);
            expect(customer.packedParts).to.equal(0);
            expect(customer.totalParts).to.equal(3);
            expect(customer.packSeqs).to.deep.equal([]);
            expect(customer.statusHistory).to.be.an('array');
            expect(customer.statusHistory).to.have.lengthOf(1);
            expect(customer.statusHistory[0].status).to.equal(customerStatusManager.STATUS.NOT_PACKED);
            expect(customer.statusHistory[0].shipmentStatus).to.equal(customerStatusManager.SHIPMENT_STATUS.NOT_SHIPPED);
        });

        it('应该正确从文件系统读取客户状态', () => {
            const customerData = {
                name: '文件读取测试客户',
                panels: [{ id: 'panel1', name: '面板1' }]
            };

            const createdCustomer = customerFSInstance.createOrUpdateCustomer(customerData, '测试用户');
            const retrievedCustomer = customerFSInstance.getCustomerById(createdCustomer.id);

            expect(retrievedCustomer.status).to.equal(customerStatusManager.STATUS.NOT_PACKED);
            expect(retrievedCustomer.shipmentStatus).to.equal(customerStatusManager.SHIPMENT_STATUS.NOT_SHIPPED);
            expect(retrievedCustomer.statusHistory).to.be.an('array');
            expect(retrievedCustomer.statusHistory).to.have.lengthOf(1);
        });
    });

    describe('打包状态管理', () => {
        let customer;
        let packagesData;

        beforeEach(() => {
            const customerData = {
                name: '打包状态测试客户',
                panels: [
                    { id: 'panel1', name: '面板1' },
                    { id: 'panel2', name: '面板2' },
                    { id: 'panel3', name: '面板3' }
                ]
            };

            customer = customerFSInstance.createOrUpdateCustomer(customerData, '测试用户');

            packagesData = [
                {
                    packSeq: 'pack1',
                    packNo: '001',
                    packDate: '2023-01-01',
                    partIDs: ['panel1', 'panel2']
                }
            ];
        });

        it('应该正确计算部分打包状态', () => {
            const packStatus = customerStatusManager.checkPackStatus(customer, packagesData);

            expect(packStatus.status).to.equal(customerStatusManager.STATUS.IN_PROGRESS);
            expect(packStatus.packProgress).to.equal(67); // 2/3 ≈ 67%
            expect(packStatus.packedParts).to.equal(2);
            expect(packStatus.totalParts).to.equal(3);
            expect(packStatus.packSeqs).to.deep.equal(['pack1']);
        });

        it('应该正确更新客户打包状态', () => {
            const packStatus = customerStatusManager.checkPackStatus(customer, packagesData);

            const updatedCustomer = customerFSInstance.updateCustomerStatus(
                customer.id,
                packStatus,
                '测试用户',
                '部分打包完成'
            );

            expect(updatedCustomer.status).to.equal(customerStatusManager.STATUS.IN_PROGRESS);
            expect(updatedCustomer.shipmentStatus).to.equal(customerStatusManager.SHIPMENT_STATUS.NOT_SHIPPED);
            expect(updatedCustomer.packedParts).to.equal(2);
            expect(updatedCustomer.totalParts).to.equal(3);
            expect(updatedCustomer.packProgress).to.equal(67);
            expect(updatedCustomer.packSeqs).to.deep.equal(['pack1']);
            expect(updatedCustomer.lastPackUpdate).to.be.a('string');

            // 验证状态历史
            expect(updatedCustomer.statusHistory).to.have.lengthOf(2);
            const lastRecord = updatedCustomer.statusHistory[updatedCustomer.statusHistory.length - 1];
            expect(lastRecord.status).to.equal(customerStatusManager.STATUS.IN_PROGRESS);
            expect(lastRecord.shipmentStatus).to.equal(customerStatusManager.SHIPMENT_STATUS.NOT_SHIPPED);
            expect(lastRecord.previousStatus).to.equal(customerStatusManager.STATUS.NOT_PACKED);
            expect(lastRecord.previousShipmentStatus).to.equal(customerStatusManager.SHIPMENT_STATUS.NOT_SHIPPED);
            expect(lastRecord.operator).to.equal('测试用户');
            expect(lastRecord.remark).to.equal('部分打包完成');
        });

        it('应该正确计算完全打包状态', () => {
            const completePackagesData = [
                {
                    packSeq: 'pack1',
                    packNo: '001',
                    packDate: '2023-01-01',
                    partIDs: ['panel1', 'panel2', 'panel3']
                }
            ];

            const packStatus = customerStatusManager.checkPackStatus(customer, completePackagesData);

            expect(packStatus.status).to.equal(customerStatusManager.STATUS.PACKED);
            expect(packStatus.packProgress).to.equal(100);
            expect(packStatus.packedParts).to.equal(3);
            expect(packStatus.totalParts).to.equal(3);
        });

        it('应该正确记录打包完成时间', () => {
            const completePackagesData = [
                {
                    packSeq: 'pack1',
                    packNo: '001',
                    packDate: '2023-01-01',
                    partIDs: ['panel1', 'panel2', 'panel3']
                }
            ];

            const packStatus = customerStatusManager.checkPackStatus(customer, completePackagesData);
            const updatedCustomer = customerFSInstance.updateCustomerStatus(
                customer.id,
                packStatus,
                '测试用户',
                '打包完成'
            );

            expect(updatedCustomer.packDate).to.be.a('string');
            expect(updatedCustomer.status).to.equal(customerStatusManager.STATUS.PACKED);
        });
    });

    describe('出货状态管理', () => {
        let customer;

        beforeEach(() => {
            const customerData = {
                name: '出货状态测试客户',
                panels: [
                    { id: 'panel1', name: '面板1' },
                    { id: 'panel2', name: '面板2' }
                ]
            };

            customer = customerFSInstance.createOrUpdateCustomer(customerData, '测试用户');

            // 先设置为已打包状态
            const packStatusInfo = {
                status: customerStatusManager.STATUS.PACKED,
                shipmentStatus: customerStatusManager.SHIPMENT_STATUS.NOT_SHIPPED,
                packedParts: 2,
                totalParts: 2,
                packProgress: 100,
                packSeqs: ['pack1']
            };

            customerFSInstance.updateCustomerStatus(customer.id, packStatusInfo, '测试用户', '打包完成');
        });

        it('应该正确更新出货状态为全部出货', () => {
            const shipmentStatusInfo = {
                status: customerStatusManager.STATUS.PACKED,
                shipmentStatus: customerStatusManager.SHIPMENT_STATUS.FULL_SHIPPED,
                packedParts: 2,
                totalParts: 2,
                packProgress: 100,
                packSeqs: ['pack1']
            };

            const updatedCustomer = customerFSInstance.updateCustomerStatus(
                customer.id,
                shipmentStatusInfo,
                '测试用户',
                '全部出货完成'
            );

            expect(updatedCustomer.status).to.equal(customerStatusManager.STATUS.PACKED);
            expect(updatedCustomer.shipmentStatus).to.equal(customerStatusManager.SHIPMENT_STATUS.FULL_SHIPPED);
            expect(updatedCustomer.shipmentDate).to.be.a('string');
            expect(updatedCustomer.lastShipmentUpdate).to.be.a('string');

            // 验证状态历史
            expect(updatedCustomer.statusHistory).to.have.lengthOf(3); // 初始 + 打包 + 出货
            const lastRecord = updatedCustomer.statusHistory[updatedCustomer.statusHistory.length - 1];
            expect(lastRecord.status).to.equal(customerStatusManager.STATUS.PACKED);
            expect(lastRecord.shipmentStatus).to.equal(customerStatusManager.SHIPMENT_STATUS.FULL_SHIPPED);
            expect(lastRecord.previousStatus).to.equal(customerStatusManager.STATUS.PACKED);
            expect(lastRecord.previousShipmentStatus).to.equal(customerStatusManager.SHIPMENT_STATUS.NOT_SHIPPED);
            expect(lastRecord.operator).to.equal('测试用户');
            expect(lastRecord.remark).to.equal('全部出货完成');
        });

        it('应该正确更新出货状态为部分出货', () => {
            const shipmentStatusInfo = {
                status: customerStatusManager.STATUS.PACKED,
                shipmentStatus: customerStatusManager.SHIPMENT_STATUS.PARTIAL_SHIPPED,
                packedParts: 2,
                totalParts: 2,
                packProgress: 100,
                packSeqs: ['pack1']
            };

            const updatedCustomer = customerFSInstance.updateCustomerStatus(
                customer.id,
                shipmentStatusInfo,
                '测试用户',
                '部分出货完成'
            );

            expect(updatedCustomer.status).to.equal(customerStatusManager.STATUS.PACKED);
            expect(updatedCustomer.shipmentStatus).to.equal(customerStatusManager.SHIPMENT_STATUS.PARTIAL_SHIPPED);
            expect(updatedCustomer.shipmentDate).to.be.a('string');
        });

        it('应该阻止未打包客户进行出货操作', () => {
            const unpackedCustomerData = {
                name: '未打包客户',
                panels: [{ id: 'panel1', name: '面板1' }]
            };

            const unpackedCustomer = customerFSInstance.createOrUpdateCustomer(unpackedCustomerData, '测试用户');

            const shipmentStatusInfo = {
                status: customerStatusManager.STATUS.NOT_PACKED,
                shipmentStatus: customerStatusManager.SHIPMENT_STATUS.FULL_SHIPPED,
                packedParts: 0,
                totalParts: 1,
                packProgress: 0,
                packSeqs: []
            };

            expect(() => {
                customerFSInstance.updateCustomerStatus(
                    unpackedCustomer.id,
                    shipmentStatusInfo,
                    '测试用户',
                    '尝试出货'
                );
            }).to.throw('未打包的客户不能进行出货操作');
        });
    });

    describe('状态历史记录', () => {
        it('应该正确记录完整的状态变更历史', () => {
            const customerData = {
                name: '状态历史测试客户',
                panels: [
                    { id: 'panel1', name: '面板1' },
                    { id: 'panel2', name: '面板2' }
                ]
            };

            const customer = customerFSInstance.createOrUpdateCustomer(customerData, '测试用户');

            // 部分打包
            const partialPackStatus = {
                status: customerStatusManager.STATUS.IN_PROGRESS,
                shipmentStatus: customerStatusManager.SHIPMENT_STATUS.NOT_SHIPPED,
                packedParts: 1,
                totalParts: 2,
                packProgress: 50,
                packSeqs: ['pack1']
            };

            customerFSInstance.updateCustomerStatus(customer.id, partialPackStatus, '测试用户', '部分打包');

            // 完全打包
            const fullPackStatus = {
                status: customerStatusManager.STATUS.PACKED,
                shipmentStatus: customerStatusManager.SHIPMENT_STATUS.NOT_SHIPPED,
                packedParts: 2,
                totalParts: 2,
                packProgress: 100,
                packSeqs: ['pack1', 'pack2']
            };

            customerFSInstance.updateCustomerStatus(customer.id, fullPackStatus, '测试用户', '完全打包');

            // 全部出货
            const fullShipmentStatus = {
                status: customerStatusManager.STATUS.PACKED,
                shipmentStatus: customerStatusManager.SHIPMENT_STATUS.FULL_SHIPPED,
                packedParts: 2,
                totalParts: 2,
                packProgress: 100,
                packSeqs: ['pack1', 'pack2']
            };

            customerFSInstance.updateCustomerStatus(customer.id, fullShipmentStatus, '测试用户', '全部出货');

            // 验证状态历史
            const history = customerFSInstance.getCustomerStatusHistory(customer.id);
            expect(history).to.have.lengthOf(4); // 初始 + 部分打包 + 完全打包 + 全部出货

            // 验证每个历史记录
            expect(history[0].status).to.equal(customerStatusManager.STATUS.NOT_PACKED);
            expect(history[0].shipmentStatus).to.equal(customerStatusManager.SHIPMENT_STATUS.NOT_SHIPPED);
            expect(history[0].operator).to.equal('系统');

            expect(history[1].status).to.equal(customerStatusManager.STATUS.IN_PROGRESS);
            expect(history[1].shipmentStatus).to.equal(customerStatusManager.SHIPMENT_STATUS.NOT_SHIPPED);
            expect(history[1].previousStatus).to.equal(customerStatusManager.STATUS.NOT_PACKED);
            expect(history[1].previousShipmentStatus).to.equal(customerStatusManager.SHIPMENT_STATUS.NOT_SHIPPED);
            expect(history[1].operator).to.equal('测试用户');
            expect(history[1].remark).to.equal('部分打包');

            expect(history[2].status).to.equal(customerStatusManager.STATUS.PACKED);
            expect(history[2].shipmentStatus).to.equal(customerStatusManager.SHIPMENT_STATUS.NOT_SHIPPED);
            expect(history[2].previousStatus).to.equal(customerStatusManager.STATUS.IN_PROGRESS);
            expect(history[2].previousShipmentStatus).to.equal(customerStatusManager.SHIPMENT_STATUS.NOT_SHIPPED);
            expect(history[2].operator).to.equal('测试用户');
            expect(history[2].remark).to.equal('完全打包');

            expect(history[3].status).to.equal(customerStatusManager.STATUS.PACKED);
            expect(history[3].shipmentStatus).to.equal(customerStatusManager.SHIPMENT_STATUS.FULL_SHIPPED);
            expect(history[3].previousStatus).to.equal(customerStatusManager.STATUS.PACKED);
            expect(history[3].previousShipmentStatus).to.equal(customerStatusManager.SHIPMENT_STATUS.NOT_SHIPPED);
            expect(history[3].operator).to.equal('测试用户');
            expect(history[3].remark).to.equal('全部出货');
        });
    });

    describe('状态颜色管理', () => {
        it('应该正确返回状态颜色', () => {
            expect(customerStatusManager.getStatusColor(customerStatusManager.STATUS.NOT_PACKED)).to.equal('#888888');
            expect(customerStatusManager.getStatusColor(customerStatusManager.STATUS.IN_PROGRESS)).to.equal('#2196F3');
            expect(customerStatusManager.getStatusColor(customerStatusManager.STATUS.PACKED)).to.equal('#FFC107');
            expect(customerStatusManager.getStatusColor(customerStatusManager.STATUS.ARCHIVED)).to.equal('#9C27B0');
        });

        it('应该正确返回出货状态颜色', () => {
            expect(customerStatusManager.getShipmentStatusColor(customerStatusManager.SHIPMENT_STATUS.NOT_SHIPPED)).to.equal('#888888');
            expect(customerStatusManager.getShipmentStatusColor(customerStatusManager.SHIPMENT_STATUS.PARTIAL_SHIPPED)).to.equal('#FFCA28');
            expect(customerStatusManager.getShipmentStatusColor(customerStatusManager.SHIPMENT_STATUS.FULL_SHIPPED)).to.equal('#4CAF50');
        });
    });

    describe('客户统计信息', () => {
        it('应该正确计算客户统计信息', () => {
            // 创建不同状态的客户
            const customers = [
                { name: '未打包客户', panels: [{ id: 'panel1', name: '面板1' }] },
                { name: '正在处理客户', panels: [{ id: 'panel2', name: '面板2' }] },
                { name: '已打包客户', panels: [{ id: 'panel3', name: '面板3' }] },
                { name: '已归档客户', panels: [{ id: 'panel4', name: '面板4' }] }
            ];

            customers.forEach(customer => {
                customerFSInstance.createOrUpdateCustomer(customer, '测试用户');
            });

            const customerList = customerFSInstance.getAllCustomers();

            // 更新客户状态
            customerFSInstance.updateCustomerStatus(customerList[1].id, {
                status: customerStatusManager.STATUS.IN_PROGRESS,
                shipmentStatus: customerStatusManager.SHIPMENT_STATUS.NOT_SHIPPED,
                packedParts: 1,
                totalParts: 1,
                packProgress: 100
            }, '测试用户');

            customerFSInstance.updateCustomerStatus(customerList[2].id, {
                status: customerStatusManager.STATUS.PACKED,
                shipmentStatus: customerStatusManager.SHIPMENT_STATUS.NOT_SHIPPED,
                packedParts: 1,
                totalParts: 1,
                packProgress: 100
            }, '测试用户');

            customerFSInstance.updateCustomerStatus(customerList[3].id, {
                status: customerStatusManager.STATUS.ARCHIVED,
                shipmentStatus: customerStatusManager.SHIPMENT_STATUS.NOT_SHIPPED,
                packedParts: 1,
                totalParts: 1,
                packProgress: 100
            }, '测试用户');

            // 设置出货状态
            customerFSInstance.updateCustomerStatus(customerList[2].id, {
                status: customerStatusManager.STATUS.PACKED,
                shipmentStatus: customerStatusManager.SHIPMENT_STATUS.FULL_SHIPPED,
                packedParts: 1,
                totalParts: 1,
                packProgress: 100
            }, '测试用户');

            const statistics = customerFSInstance.getCustomerStatistics();

            expect(statistics.total).to.equal(4);
            expect(statistics.notPacked).to.equal(1);
            expect(statistics.inProgress).to.equal(1);
            expect(statistics.packed).to.equal(1);
            expect(statistics.archived).to.equal(1);
            expect(statistics.notShipped).to.equal(3);
            expect(statistics.partialShipped).to.equal(0);
            expect(statistics.fullShipped).to.equal(1);
            expect(statistics.totalPanels).to.equal(4);
            expect(statistics.packedPanels).to.equal(3);
        });
    });

    describe('业务操作集成', () => {
        let customer;

        beforeEach(() => {
            const customerData = {
                name: '业务操作测试客户',
                panels: [
                    { id: 'panel1', name: '面板1' },
                    { id: 'panel2', name: '面板2' }
                ]
            };

            customer = customerFSInstance.createOrUpdateCustomer(customerData, '测试用户');

            // 先设置为已打包状态
            const packStatusInfo = {
                status: customerStatusManager.STATUS.PACKED,
                shipmentStatus: customerStatusManager.SHIPMENT_STATUS.NOT_SHIPPED,
                packedParts: 2,
                totalParts: 2,
                packProgress: 100,
                packSeqs: ['pack1']
            };

            customerFSInstance.updateCustomerStatus(customer.id, packStatusInfo, '测试用户', '打包完成');
        });

        it('应该正确执行归档操作', () => {
            const archivedCustomer = customerStatusManager.archiveCustomer(customer, '测试用户');

            expect(archivedCustomer.status).to.equal(customerStatusManager.STATUS.ARCHIVED);
            expect(archivedCustomer.archiveDate).to.be.a('string');
        });

        it('应该正确执行全部出货操作', () => {
            const shippedCustomer = customerStatusManager.shipCustomer(customer, '测试用户');

            expect(shippedCustomer.shipmentStatus).to.equal(customerStatusManager.SHIPMENT_STATUS.FULL_SHIPPED);
            expect(shippedCustomer.shipmentDate).to.be.a('string');
        });

        it('应该正确执行部分出货操作', () => {
            const partialShippedCustomer = customerStatusManager.partialShipCustomer(customer, '测试用户');

            expect(partialShippedCustomer.shipmentStatus).to.equal(customerStatusManager.SHIPMENT_STATUS.PARTIAL_SHIPPED);
            expect(partialShippedCustomer.shipmentDate).to.be.a('string');
        });

        it('应该正确执行标记未出货操作', () => {
            // 先设置为出货状态
            customer.shipmentStatus = customerStatusManager.SHIPMENT_STATUS.FULL_SHIPPED;

            const notShippedCustomer = customerStatusManager.markCustomerNotShipped(customer, '测试用户');

            expect(notShippedCustomer.shipmentStatus).to.equal(customerStatusManager.SHIPMENT_STATUS.NOT_SHIPPED);
        });
    });
});