const customerStatusManager = require('../utils/customer-status-manager');

describe('CustomerStatusManager', () => {
    describe('构造函数和状态枚举', () => {
        it('应该正确初始化状态枚举', () => {
            expect(customerStatusManager.STATUS).toEqual({
                NOT_PACKED: '未打包',
                IN_PROGRESS: '正在处理',
                PACKED: '已打包',
                ARCHIVED: '已归档'
            });

            expect(customerStatusManager.SHIPMENT_STATUS).toEqual({
                NOT_SHIPPED: '未出货',
                PARTIAL_SHIPPED: '部分出货',
                FULL_SHIPPED: '全部出货'
            });

            expect(customerStatusManager.REPLACEMENT_STATUS).toEqual({
                NONE: '无补件',
                PENDING: '补件待处理',
                PROCESSING: '补件处理中',
                COMPLETED: '补件完成'
            });
        });

        it('应该正确初始化状态颜色映射', () => {
            expect(customerStatusManager.STATUS_COLORS).toEqual({
                '未打包': '#888888',
                '正在处理': '#2196F3',
                '已打包': '#FFC107',
                '已归档': '#9C27B0'
            });

            expect(customerStatusManager.SHIPMENT_STATUS_COLORS).toEqual({
                '未出货': '#888888',
                '部分出货': '#FFCA28',
                '全部出货': '#4CAF50'
            });
        });
    });

    describe('checkPackStatus', () => {
        it('应该正确处理空数据', () => {
            const result = customerStatusManager.checkPackStatus(null, null);

            expect(result.status).toEqual('未打包');
            expect(result.packProgress).toEqual(0);
            expect(result.packedCount).toEqual(0);
            expect(result.totalParts).toEqual(0);
            expect(result.packSeqs).toEqual([]);
        });

        it('应该正确计算未打包状态', () => {
            const customerData = {
                panels: [{ id: 'part1' }, { id: 'part2' }],
                packSeqs: []
            };
            const packagesData = [];

            const result = customerStatusManager.checkPackStatus(customerData, packagesData);
            expect(result.status).toEqual('未打包');
            expect(result.packProgress).toEqual(0);
            expect(result.packedCount).toEqual(0);
            expect(result.totalParts).toEqual(2);
        });

        it('应该正确计算部分打包状态', () => {
            const customerData = {
                panels: [{ id: 'part1' }, { id: 'part2' }, { id: 'part3' }],
                packSeqs: []
            };
            const packagesData = [
                {
                    packSeq: 'pack1',
                    packNo: '001',
                    packDate: '2023-01-01',
                    partIDs: ['part1', 'part2']
                }
            ];

            const result = customerStatusManager.checkPackStatus(customerData, packagesData);
            expect(result.status).toEqual('正在处理');
            expect(result.packProgress).toEqual(67); // 2/3 ≈ 67%
            expect(result.packedCount).toEqual(2);
            expect(result.totalParts).toEqual(3);
            expect(result.packSeqs).toEqual(['pack1']);
        });

        it('应该正确计算完全打包状态', () => {
            const customerData = {
                panels: [{ id: 'part1' }, { id: 'part2' }],
                packSeqs: []
            };
            const packagesData = [
                {
                    packSeq: 'pack1',
                    packNo: '001',
                    packDate: '2023-01-01',
                    partIDs: ['part1', 'part2']
                }
            ];

            const result = customerStatusManager.checkPackStatus(customerData, packagesData);
            expect(result.status).toEqual('已打包');
            expect(result.packProgress).toEqual(100);
            expect(result.packedCount).toEqual(2);
            expect(result.totalParts).toEqual(2);
        });
    });

    describe('updateCustomerStatus', () => {
        let customerData;
        let statusInfo;
        let clock;

        beforeEach(() => {
            jest.useFakeTimers();
            jest.setSystemTime(new Date('2023-01-01T00:00:00.000Z'));
            customerData = {
                name: '测试客户',
                status: '未打包',
                shipmentStatus: '未出货',
                packedParts: 0,
                totalParts: 5,
                packProgress: 0,
                packSeqs: []
            };
            statusInfo = {
                status: '正在处理',
                shipmentStatus: '未出货',
                packedCount: 2,
                totalParts: 5,
                packProgress: 40,
                packSeqs: ['pack1'],
                timestamp: '2023-01-01T00:00:00.000Z'
            };
        });

        afterEach(() => {
            jest.useRealTimers();
        });

        it('应该正确更新客户状态', () => {
            const result = customerStatusManager.updateCustomerStatus(customerData, statusInfo, '测试用户', '状态更新');

            expect(result.status).toEqual('正在处理');
            expect(result.shipmentStatus).toEqual('未出货');
            expect(result.packedParts).toEqual(2);
            expect(result.totalParts).toEqual(5);
            expect(result.packProgress).toEqual(40);
            expect(result.packSeqs).toEqual(['pack1']);
            expect(result.lastPackUpdate).toEqual('2023-01-01T00:00:00.000Z');
        });

        it('应该正确初始化状态历史', () => {
            const customerWithoutHistory = { ...customerData };
            delete customerWithoutHistory.statusHistory;

            const result = customerStatusManager.updateCustomerStatus(customerWithoutHistory, statusInfo, '测试用户');

            expect(result.statusHistory).toBeInstanceOf(Array);
            expect(result.statusHistory).toHaveLength(2); // 初始状态 + 当前更新
            expect(result.statusHistory[0].status).toEqual('未打包');
            expect(result.statusHistory[0].shipmentStatus).toEqual('未出货');
            expect(result.statusHistory[0].operator).toEqual('系统');
        });

        it('应该正确记录状态变更历史', () => {
            const result = customerStatusManager.updateCustomerStatus(customerData, statusInfo, '测试用户', '状态更新');

            expect(result.statusHistory).toBeInstanceOf(Array);
            const lastRecord = result.statusHistory[result.statusHistory.length - 1];
            expect(lastRecord.status).toEqual('正在处理');
            expect(lastRecord.shipmentStatus).toEqual('未出货');
            expect(lastRecord.previousStatus).toEqual('未打包');
            expect(lastRecord.previousShipmentStatus).toEqual('未出货');
            expect(lastRecord.operator).toEqual('测试用户');
            expect(lastRecord.remark).toEqual('状态更新');
        });

        it('应该正确记录打包时间', () => {
            statusInfo.status = '已打包';
            const result = customerStatusManager.updateCustomerStatus(customerData, statusInfo, '测试用户');

            expect(result.packDate).toEqual('2023-01-01T00:00:00.000Z');
        });

        it('应该正确记录归档时间', () => {
            statusInfo.status = '已归档';
            const result = customerStatusManager.updateCustomerStatus(customerData, statusInfo, '测试用户');

            expect(result.archiveDate).toEqual('2023-01-01T00:00:00.000Z');
        });

        it('应该正确记录出货时间', () => {
            statusInfo.shipmentStatus = '全部出货';
            const result = customerStatusManager.updateCustomerStatus(customerData, statusInfo, '测试用户');

            expect(result.shipmentDate).toEqual('2023-01-01T00:00:00.000Z');
        });
    });

    describe('updatePackStatus', () => {
        let customerData;

        beforeEach(() => {
            customerData = {
                name: '测试客户',
                status: '未打包',
                shipmentStatus: '未出货',
                packedParts: 0,
                totalParts: 5,
                packProgress: 0
            };
        });

        it('应该正确更新打包状态', () => {
            const result = customerStatusManager.updatePackStatus(customerData, '正在处理', '测试用户');

            expect(result.status).toEqual('正在处理');
            expect(result.shipmentStatus).toEqual('未出货');
            expect(typeof result.lastPackUpdate).toBe('string');
        });

        it('应该拒绝无效的打包状态', () => {
            expect(() => {
                customerStatusManager.updatePackStatus(customerData, '无效状态', '测试用户');
            }).toThrow('无效的打包状态');
        });
    });

    describe('updateShipmentStatus', () => {
        let customerData;

        beforeEach(() => {
            customerData = {
                name: '测试客户',
                status: '已打包',
                shipmentStatus: '未出货',
                packedParts: 5,
                totalParts: 5,
                packProgress: 100
            };
        });

        it('应该正确更新出货状态', () => {
            const result = customerStatusManager.updateShipmentStatus(customerData, '全部出货', '测试用户');

            expect(result.status).toEqual('已打包');
            expect(result.shipmentStatus).toEqual('全部出货');
            expect(typeof result.lastShipmentUpdate).toBe('string');
        });

        it('应该拒绝无效的出货状态', () => {
            expect(() => {
                customerStatusManager.updateShipmentStatus(customerData, '无效状态', '测试用户');
            }).toThrow('无效的出货状态');
        });

        it('应该阻止未打包客户进行出货操作', () => {
            customerData.status = '未打包';

            expect(() => {
                customerStatusManager.updateShipmentStatus(customerData, '全部出货', '测试用户');
            }).toThrow('未打包的客户不能进行出货操作');
        });
    });

    describe('状态颜色方法', () => {
        it('应该返回正确的状态颜色', () => {
            expect(customerStatusManager.getStatusColor('未打包')).toEqual('#888888');
            expect(customerStatusManager.getStatusColor('正在处理')).toEqual('#2196F3');
            expect(customerStatusManager.getStatusColor('已打包')).toEqual('#FFC107');
            expect(customerStatusManager.getStatusColor('已归档')).toEqual('#9C27B0');
            expect(customerStatusManager.getStatusColor('未知状态')).toEqual('#999999');
        });

        it('应该返回正确的出货状态颜色', () => {
            expect(customerStatusManager.getShipmentStatusColor('未出货')).toEqual('#888888');
            expect(customerStatusManager.getShipmentStatusColor('部分出货')).toEqual('#FFCA28');
            expect(customerStatusManager.getShipmentStatusColor('全部出货')).toEqual('#4CAF50');
            expect(customerStatusManager.getShipmentStatusColor('未知状态')).toEqual('#999999');
        });

        it('应该返回正确的补件状态颜色', () => {
            expect(customerStatusManager.getReplacementStatusColor('无补件')).toEqual('#888888');
            expect(customerStatusManager.getReplacementStatusColor('补件待处理')).toEqual('#FF9800');
            expect(customerStatusManager.getReplacementStatusColor('补件处理中')).toEqual('#2196F3');
            expect(customerStatusManager.getReplacementStatusColor('补件完成')).toEqual('#4CAF50');
            expect(customerStatusManager.getReplacementStatusColor('未知状态')).toEqual('#999999');
        });
    });

    describe('业务操作方法', () => {
        let customerData;

        beforeEach(() => {
            customerData = {
                name: '测试客户',
                status: '已打包',
                shipmentStatus: '未出货',
                packedParts: 5,
                totalParts: 5,
                packProgress: 100
            };
        });

        it('应该正确归档客户', () => {
            const result = customerStatusManager.archiveCustomer(customerData, '测试用户');

            expect(result.status).toEqual('已归档');
            expect(typeof result.archiveDate).toBe('string');
        });

        it('应该阻止归档未打包的客户', () => {
            customerData.status = '未打包';

            expect(() => {
                customerStatusManager.archiveCustomer(customerData, '测试用户');
            }).toThrow('只有已打包的客户才能归档');
        });

        it('应该正确执行全部出货', () => {
            const result = customerStatusManager.shipCustomer(customerData, '测试用户');

            expect(result.shipmentStatus).toEqual('全部出货');
            expect(typeof result.shipmentDate).toBe('string');
        });

        it('应该正确执行部分出货', () => {
            const result = customerStatusManager.partialShipCustomer(customerData, '测试用户');

            expect(result.shipmentStatus).toEqual('部分出货');
            expect(typeof result.shipmentDate).toBe('string');
        });

        it('应该正确标记为未出货', () => {
            customerData.shipmentStatus = '全部出货';
            const result = customerStatusManager.markCustomerNotShipped(customerData, '测试用户');

            expect(result.shipmentStatus).toEqual('未出货');
        });

        it('应该阻止未打包或未处理客户进行出货操作', () => {
            customerData.status = '未打包';

            expect(() => {
                customerStatusManager.shipCustomer(customerData, '测试用户');
            }).toThrow('只有已打包或正在处理的客户才能出货');

            expect(() => {
                customerStatusManager.partialShipCustomer(customerData, '测试用户');
            }).toThrow('只有已打包或正在处理的客户才能部分出货');
        });
    });

    describe('updateReplacementStatus', () => {
        let customerData;

        beforeEach(() => {
            customerData = {
                name: '测试客户',
                status: '已打包',
                shipmentStatus: '全部出货',
                replacementStatus: '无补件'
            };
        });

        it('应该正确更新补件状态', () => {
            const result = customerStatusManager.updateReplacementStatus(customerData, '补件待处理', '测试用户');

            expect(result.replacementStatus).toEqual('补件待处理');
            expect(typeof result.lastReplacementUpdate).toBe('string');
        });

        it('应该拒绝无效的补件状态', () => {
            expect(() => {
                customerStatusManager.updateReplacementStatus(customerData, '无效状态', '测试用户');
            }).toThrow('无效的补件状态');
        });

        it('应该正确记录补件状态变更历史', () => {
            const result = customerStatusManager.updateReplacementStatus(customerData, '补件完成', '测试用户', '补件完成');

            expect(Array.isArray(result.statusHistory)).toBe(true);
            const lastRecord = result.statusHistory[result.statusHistory.length - 1];
            expect(lastRecord.replacementStatus).toEqual('补件完成');
            expect(lastRecord.previousReplacementStatus).toEqual('无补件');
            expect(lastRecord.remark).toEqual('补件完成');
        });
    });

    describe('getReplacementColor', () => {
        it('应该返回正确的补件状态颜色', () => {
            expect(customerStatusManager.getReplacementColor('无补件')).toEqual('#888888');
            expect(customerStatusManager.getReplacementColor('补件待处理')).toEqual('#FF9800');
            expect(customerStatusManager.getReplacementColor('补件处理中')).toEqual('#2196F3');
            expect(customerStatusManager.getReplacementColor('补件完成')).toEqual('#4CAF50');
            expect(customerStatusManager.getReplacementColor('未知状态')).toEqual('#888888');
        });
    });
});