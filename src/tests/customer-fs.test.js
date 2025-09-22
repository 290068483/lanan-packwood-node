const { expect } = require('chai');
const sinon = require('sinon');
const fs = require('fs');
const path = require('path');
const customerFS = require('../database/models/customer-fs');
const customerStatusManager = require('../utils/customer-status-manager');

describe('CustomerFS', () => {
    let customerFSInstance;
    let mockDataPath;
    let mockPanelsPath;
    let mockHistoryPath;
    let sandbox;

    beforeEach(() => {
        sandbox = sinon.createSandbox();

        // 创建临时文件路径
        mockDataPath = path.join(__dirname, '../../data/test-database.json');
        mockPanelsPath = path.join(__dirname, '../../data/test-panels.json');
        mockHistoryPath = path.join(__dirname, '../../data/test-history.json');

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

    describe('构造函数和文件初始化', () => {
        it('应该正确创建数据文件', () => {
            customerFSInstance.ensureDataFilesExist();

            expect(fs.existsSync(mockDataPath)).to.be.true;
            expect(fs.existsSync(mockPanelsPath)).to.be.true;
            expect(fs.existsSync(mockHistoryPath)).to.be.true;

            const data = JSON.parse(fs.readFileSync(mockDataPath, 'utf8'));
            expect(data).to.deep.equal({
                customers: [],
                settings: {},
                history: []
            });

            const panels = JSON.parse(fs.readFileSync(mockPanelsPath, 'utf8'));
            expect(panels).to.deep.equal([]);

            const history = JSON.parse(fs.readFileSync(mockHistoryPath, 'utf8'));
            expect(history).to.deep.equal([]);
        });
    });

    describe('createOrUpdateCustomer', () => {
        it('应该创建新客户并设置初始状态', () => {
            const customerData = {
                name: '测试客户',
                address: '测试地址',
                phone: '1234567890',
                email: 'test@example.com',
                panels: [
                    { id: 'panel1', name: '面板1' },
                    { id: 'panel2', name: '面板2' }
                ]
            };

            const result = customerFSInstance.createOrUpdateCustomer(customerData, '测试用户');

            expect(result.name).to.equal('测试客户');
            expect(result.status).to.equal(customerStatusManager.STATUS.NOT_PACKED);
            expect(result.shipmentStatus).to.equal(customerStatusManager.SHIPMENT_STATUS.NOT_SHIPPED);
            expect(result.packProgress).to.equal(0);
            expect(result.packedParts).to.equal(0);
            expect(result.totalParts).to.equal(2);
            expect(result.packSeqs).to.deep.equal([]);
            expect(result.createdAt).to.be.a('string');
            expect(result.updatedAt).to.be.a('string');
            expect(result.lastPackUpdate).to.be.a('string');
            expect(result.lastShipmentUpdate).to.be.a('string');
        });

        it('应该更新现有客户', () => {
            // 先创建客户
            const customerData = {
                name: '测试客户',
                panels: [{ id: 'panel1', name: '面板1' }]
            };
            const createdCustomer = customerFSInstance.createOrUpdateCustomer(customerData, '测试用户');

            // 更新客户
            const updateData = {
                name: '测试客户',
                address: '新地址',
                phone: '新电话',
                panels: [
                    { id: 'panel1', name: '更新面板1' },
                    { id: 'panel2', name: '新面板2' }
                ]
            };
            const updatedCustomer = customerFSInstance.createOrUpdateCustomer(updateData, '更新用户');

            expect(updatedCustomer.id).to.equal(createdCustomer.id);
            expect(updatedCustomer.address).to.equal('新地址');
            expect(updatedCustomer.phone).to.equal('新电话');
            expect(updatedCustomer.panels).to.have.lengthOf(2);
            expect(updatedCustomer.updatedAt).to.not.equal(createdCustomer.updatedAt);
        });

        it('应该拒绝没有名称的客户', () => {
            const customerData = {
                address: '测试地址',
                panels: [{ id: 'panel1', name: '面板1' }]
            };

            expect(() => {
                customerFSInstance.createOrUpdateCustomer(customerData, '测试用户');
            }).to.throw('客户名称是必填项');
        });

        it('应该正确处理面板数据', () => {
            const customerData = {
                name: '测试客户',
                panels: [
                    { id: 'panel1', name: '面板1' },
                    { id: 'panel2', name: '面板2' }
                ]
            };

            customerFSInstance.createOrUpdateCustomer(customerData, '测试用户');

            const panels = customerFSInstance.readPanelsData();
            expect(panels).to.have.lengthOf(2);
            expect(panels[0].customerId).to.be.a('string');
            expect(panels[0].customerName).to.equal('测试客户');
            expect(panels[1].customerId).to.be.a('string');
            expect(panels[1].customerName).to.equal('测试客户');
        });
    });

    describe('getCustomerById', () => {
        it('应该根据ID获取客户', () => {
            const customerData = {
                name: '测试客户',
                panels: [{ id: 'panel1', name: '面板1' }]
            };
            const createdCustomer = customerFSInstance.createOrUpdateCustomer(customerData, '测试用户');

            const result = customerFSInstance.getCustomerById(createdCustomer.id);

            expect(result).to.not.be.null;
            expect(result.id).to.equal(createdCustomer.id);
            expect(result.name).to.equal('测试客户');
            expect(result.status).to.equal(customerStatusManager.STATUS.NOT_PACKED);
            expect(result.shipmentStatus).to.equal(customerStatusManager.SHIPMENT_STATUS.NOT_SHIPPED);
        });

        it('应该为不存在的ID返回null', () => {
            const result = customerFSInstance.getCustomerById('non-existent-id');
            expect(result).to.be.null;
        });

        it('应该确保状态历史存在', () => {
            const customerData = {
                name: '测试客户',
                panels: [{ id: 'panel1', name: '面板1' }]
            };
            const createdCustomer = customerFSInstance.createOrUpdateCustomer(customerData, '测试用户');

            const result = customerFSInstance.getCustomerById(createdCustomer.id);

            expect(result.statusHistory).to.be.an('array');
            expect(result.statusHistory).to.have.lengthOf(1);
            expect(result.statusHistory[0].status).to.equal(customerStatusManager.STATUS.NOT_PACKED);
            expect(result.statusHistory[0].shipmentStatus).to.equal(customerStatusManager.SHIPMENT_STATUS.NOT_SHIPPED);
        });

        it('应该确保状态字段存在', () => {
            // 直接写入没有状态字段的客户数据
            const data = customerFSInstance.readDataFile();
            const customerWithoutStatus = {
                id: 'test-id',
                name: '测试客户',
                panels: [{ id: 'panel1', name: '面板1' }]
            };
            data.customers.push(customerWithoutStatus);
            customerFSInstance.writeDataFile(data);

            const result = customerFSInstance.getCustomerById('test-id');

            expect(result.status).to.equal(customerStatusManager.STATUS.NOT_PACKED);
            expect(result.shipmentStatus).to.equal(customerStatusManager.SHIPMENT_STATUS.NOT_SHIPPED);
            expect(result.packedParts).to.equal(0);
            expect(result.totalParts).to.equal(0);
            expect(result.packProgress).to.equal(0);
        });
    });

    describe('getCustomerByName', () => {
        it('应该根据名称获取客户', () => {
            const customerData = {
                name: '测试客户',
                panels: [{ id: 'panel1', name: '面板1' }]
            };
            customerFSInstance.createOrUpdateCustomer(customerData, '测试用户');

            const result = customerFSInstance.getCustomerByName('测试客户');

            expect(result).to.not.be.null;
            expect(result.name).to.equal('测试客户');
            expect(result.status).to.equal(customerStatusManager.STATUS.NOT_PACKED);
            expect(result.shipmentStatus).to.equal(customerStatusManager.SHIPMENT_STATUS.NOT_SHIPPED);
        });

        it('应该为不存在的名称返回null', () => {
            const result = customerFSInstance.getCustomerByName('不存在的客户');
            expect(result).to.be.null;
        });
    });

    describe('getAllCustomers', () => {
        it('应该获取所有客户', () => {
            const customers = [
                { name: '客户1', panels: [{ id: 'panel1', name: '面板1' }] },
                { name: '客户2', panels: [{ id: 'panel2', name: '面板2' }] },
                { name: '客户3', panels: [{ id: 'panel3', name: '面板3' }] }
            ];

            customers.forEach(customer => {
                customerFSInstance.createOrUpdateCustomer(customer, '测试用户');
            });

            const result = customerFSInstance.getAllCustomers();

            expect(result).to.have.lengthOf(3);
            expect(result[0].name).to.equal('客户1');
            expect(result[1].name).to.equal('客户2');
            expect(result[2].name).to.equal('客户3');

            // 确保所有客户都有正确的状态字段
            result.forEach(customer => {
                expect(customer.status).to.equal(customerStatusManager.STATUS.NOT_PACKED);
                expect(customer.shipmentStatus).to.equal(customerStatusManager.SHIPMENT_STATUS.NOT_SHIPPED);
            });
        });

        it('应该返回空数组当没有客户时', () => {
            const result = customerFSInstance.getAllCustomers();
            expect(result).to.be.an('array');
            expect(result).to.have.lengthOf(0);
        });
    });

    describe('updateCustomerStatus', () => {
        let customer;

        beforeEach(() => {
            const customerData = {
                name: '测试客户',
                panels: [{ id: 'panel1', name: '面板1' }]
            };
            customer = customerFSInstance.createOrUpdateCustomer(customerData, '测试用户');
        });

        it('应该正确更新客户状态', () => {
            const statusInfo = {
                status: customerStatusManager.STATUS.IN_PROGRESS,
                shipmentStatus: customerStatusManager.SHIPMENT_STATUS.NOT_SHIPPED,
                packedParts: 1,
                totalParts: 1,
                packProgress: 100,
                packSeqs: ['pack1']
            };

            const result = customerFSInstance.updateCustomerStatus(customer.id, statusInfo, '测试用户', '状态更新');

            expect(result.status).to.equal(customerStatusManager.STATUS.IN_PROGRESS);
            expect(result.shipmentStatus).to.equal(customerStatusManager.SHIPMENT_STATUS.NOT_SHIPPED);
            expect(result.packedParts).to.equal(1);
            expect(result.totalParts).to.equal(1);
            expect(result.packProgress).to.equal(100);
            expect(result.packSeqs).to.deep.equal(['pack1']);
            expect(result.lastPackUpdate).to.be.a('string');
        });

        it('应该正确记录状态变更历史', () => {
            const statusInfo = {
                status: customerStatusManager.STATUS.PACKED,
                shipmentStatus: customerStatusManager.SHIPMENT_STATUS.NOT_SHIPPED,
                packedParts: 1,
                totalParts: 1,
                packProgress: 100
            };

            const result = customerFSInstance.updateCustomerStatus(customer.id, statusInfo, '测试用户', '打包完成');

            expect(result.statusHistory).to.be.an('array');
            expect(result.statusHistory).to.have.lengthOf(2); // 初始状态 + 当前更新

            const lastRecord = result.statusHistory[result.statusHistory.length - 1];
            expect(lastRecord.status).to.equal(customerStatusManager.STATUS.PACKED);
            expect(lastRecord.shipmentStatus).to.equal(customerStatusManager.SHIPMENT_STATUS.NOT_SHIPPED);
            expect(lastRecord.previousStatus).to.equal(customerStatusManager.STATUS.NOT_PACKED);
            expect(lastRecord.previousShipmentStatus).to.equal(customerStatusManager.SHIPMENT_STATUS.NOT_SHIPPED);
            expect(lastRecord.operator).to.equal('测试用户');
            expect(lastRecord.remark).to.equal('打包完成');
        });

        it('应该正确记录打包时间', () => {
            const statusInfo = {
                status: customerStatusManager.STATUS.PACKED,
                shipmentStatus: customerStatusManager.SHIPMENT_STATUS.NOT_SHIPPED,
                packedParts: 1,
                totalParts: 1,
                packProgress: 100
            };

            const result = customerFSInstance.updateCustomerStatus(customer.id, statusInfo, '测试用户');

            expect(result.packDate).to.be.a('string');
        });

        it('应该正确记录归档时间', () => {
            // 先设置为已打包
            const packStatusInfo = {
                status: customerStatusManager.STATUS.PACKED,
                shipmentStatus: customerStatusManager.SHIPMENT_STATUS.NOT_SHIPPED,
                packedParts: 1,
                totalParts: 1,
                packProgress: 100
            };
            customerFSInstance.updateCustomerStatus(customer.id, packStatusInfo, '测试用户');

            // 然后归档
            const archiveStatusInfo = {
                status: customerStatusManager.STATUS.ARCHIVED,
                shipmentStatus: customerStatusManager.SHIPMENT_STATUS.NOT_SHIPPED,
                packedParts: 1,
                totalParts: 1,
                packProgress: 100
            };

            const result = customerFSInstance.updateCustomerStatus(customer.id, archiveStatusInfo, '测试用户');

            expect(result.archiveDate).to.be.a('string');
        });

        it('应该正确记录出货时间', () => {
            // 先设置为已打包
            const packStatusInfo = {
                status: customerStatusManager.STATUS.PACKED,
                shipmentStatus: customerStatusManager.SHIPMENT_STATUS.NOT_SHIPPED,
                packedParts: 1,
                totalParts: 1,
                packProgress: 100
            };
            customerFSInstance.updateCustomerStatus(customer.id, packStatusInfo, '测试用户');

            // 然后出货
            const shipStatusInfo = {
                status: customerStatusManager.STATUS.PACKED,
                shipmentStatus: customerStatusManager.SHIPMENT_STATUS.FULL_SHIPPED,
                packedParts: 1,
                totalParts: 1,
                packProgress: 100
            };

            const result = customerFSInstance.updateCustomerStatus(customer.id, shipStatusInfo, '测试用户');

            expect(result.shipmentDate).to.be.a('string');
        });

        it('应该为不存在的客户抛出错误', () => {
            const statusInfo = {
                status: customerStatusManager.STATUS.IN_PROGRESS,
                shipmentStatus: customerStatusManager.SHIPMENT_STATUS.NOT_SHIPPED
            };

            expect(() => {
                customerFSInstance.updateCustomerStatus('non-existent-id', statusInfo, '测试用户');
            }).to.throw('客户不存在');
        });
    });

    describe('deleteCustomer', () => {
        it('应该正确删除客户和相关面板', () => {
            const customerData = {
                name: '测试客户',
                panels: [
                    { id: 'panel1', name: '面板1' },
                    { id: 'panel2', name: '面板2' }
                ]
            };
            const customer = customerFSInstance.createOrUpdateCustomer(customerData, '测试用户');

            const result = customerFSInstance.deleteCustomer(customer.id);

            expect(result).to.be.true;

            const deletedCustomer = customerFSInstance.getCustomerById(customer.id);
            expect(deletedCustomer).to.be.null;

            const panels = customerFSInstance.readPanelsData();
            expect(panels).to.have.lengthOf(0);
        });

        it('应该为不存在的客户抛出错误', () => {
            expect(() => {
                customerFSInstance.deleteCustomer('non-existent-id');
            }).to.throw('客户不存在');
        });
    });

    describe('getCustomerStatusHistory', () => {
        it('应该获取客户状态历史', () => {
            const customerData = {
                name: '测试客户',
                panels: [{ id: 'panel1', name: '面板1' }]
            };
            const customer = customerFSInstance.createOrUpdateCustomer(customerData, '测试用户');

            // 更新状态
            const statusInfo = {
                status: customerStatusManager.STATUS.IN_PROGRESS,
                shipmentStatus: customerStatusManager.SHIPMENT_STATUS.NOT_SHIPPED,
                packedParts: 1,
                totalParts: 1,
                packProgress: 100
            };
            customerFSInstance.updateCustomerStatus(customer.id, statusInfo, '测试用户', '状态更新');

            const history = customerFSInstance.getCustomerStatusHistory(customer.id);

            expect(history).to.be.an('array');
            expect(history).to.have.lengthOf(2); // 初始状态 + 状态更新
            expect(history[0].status).to.equal(customerStatusManager.STATUS.NOT_PACKED);
            expect(history[1].status).to.equal(customerStatusManager.STATUS.IN_PROGRESS);
        });

        it('应该为不存在的客户抛出错误', () => {
            expect(() => {
                customerFSInstance.getCustomerStatusHistory('non-existent-id');
            }).to.throw('客户不存在');
        });
    });

    describe('addCustomerNote', () => {
        it('应该正确添加客户备注', () => {
            const customerData = {
                name: '测试客户',
                panels: [{ id: 'panel1', name: '面板1' }]
            };
            const customer = customerFSInstance.createOrUpdateCustomer(customerData, '测试用户');

            const result = customerFSInstance.addCustomerNote(customer.id, '这是一个备注', '备注用户');

            expect(result.notes).to.be.an('array');
            expect(result.notes).to.have.lengthOf(1);
            expect(result.notes[0].content).to.equal('这是一个备注');
            expect(result.notes[0].operator).to.equal('备注用户');
            expect(result.notes[0].timestamp).to.be.a('string');
        });

        it('应该为不存在的客户抛出错误', () => {
            expect(() => {
                customerFSInstance.addCustomerNote('non-existent-id', '备注', '用户');
            }).to.throw('客户不存在');
        });
    });

    describe('getCustomerStatistics', () => {
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

            // 更新客户状态
            const customerList = customerFSInstance.getAllCustomers();

            // 设置正在处理状态
            customerFSInstance.updateCustomerStatus(customerList[1].id, {
                status: customerStatusManager.STATUS.IN_PROGRESS,
                shipmentStatus: customerStatusManager.SHIPMENT_STATUS.NOT_SHIPPED,
                packedParts: 1,
                totalParts: 1,
                packProgress: 100
            }, '测试用户');

            // 设置已打包状态
            customerFSInstance.updateCustomerStatus(customerList[2].id, {
                status: customerStatusManager.STATUS.PACKED,
                shipmentStatus: customerStatusManager.SHIPMENT_STATUS.NOT_SHIPPED,
                packedParts: 1,
                totalParts: 1,
                packProgress: 100
            }, '测试用户');

            // 设置已归档状态
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

        it('应该正确处理空客户列表', () => {
            const statistics = customerFSInstance.getCustomerStatistics();

            expect(statistics.total).to.equal(0);
            expect(statistics.notPacked).to.equal(0);
            expect(statistics.inProgress).to.equal(0);
            expect(statistics.packed).to.equal(0);
            expect(statistics.archived).to.equal(0);
            expect(statistics.notShipped).to.equal(0);
            expect(statistics.partialShipped).to.equal(0);
            expect(statistics.fullShipped).to.equal(0);
            expect(statistics.totalPanels).to.equal(0);
            expect(statistics.packedPanels).to.equal(0);
        });
    });
});