/**
 * 补件状态管理器测试
 */

const ReplacementManager = require('../utils/replacement-manager');

describe('ReplacementManager', () => {
    describe('ReplacementStatus 枚举', () => {
        it('应该包含正确的补件状态枚举值', () => {
            expect(ReplacementManager.ReplacementStatus).toEqual({
                NONE: 'none',
                PARTIAL: 'partial',
                FULL: 'full'
            });
        });
    });

    describe('ReplacementStatusDetails', () => {
        it('应该为每个状态提供正确的详情', () => {
            const details = ReplacementManager.ReplacementStatusDetails;

            expect(details.none).toEqual({
                icon: '🔧',
                color: '#90A4AE',
                description: '无补件需求'
            });

            expect(details.partial).toEqual({
                icon: '🔧',
                color: '#FFCA28',
                description: '部分补件'
            });

            expect(details.full).toEqual({
                icon: '🔧',
                color: '#EF5350',
                description: '全部补件'
            });
        });
    });

    describe('validateReplacementStatus', () => {
        it('应该接受有效的补件状态', () => {
            expect(ReplacementManager.validateReplacementStatus('none')).toBe(true);
            expect(ReplacementManager.validateReplacementStatus('partial')).toBe(true);
            expect(ReplacementManager.validateReplacementStatus('full')).toBe(true);
        });

        it('应该拒绝无效的补件状态', () => {
            expect(ReplacementManager.validateReplacementStatus('invalid')).toBe(false);
            expect(ReplacementManager.validateReplacementStatus('')).toBe(false);
            expect(ReplacementManager.validateReplacementStatus(null)).toBe(false);
            expect(ReplacementManager.validateReplacementStatus(undefined)).toBe(false);
        });
    });

    describe('getAllowedReplacementStatuses', () => {
        it('未出货状态只允许无补件', () => {
            const result = ReplacementManager.getAllowedReplacementStatuses('unshipped');
            expect(result).toEqual(['none']);
        });

        it('部分出货状态只允许部分补件', () => {
            const result = ReplacementManager.getAllowedReplacementStatuses('partial');
            expect(result).toEqual(['partial']);
        });

        it('全部出货状态允许部分补件和全部补件', () => {
            const result = ReplacementManager.getAllowedReplacementStatuses('shipped');
            expect(result).toEqual(['partial', 'full']);
        });

        it('未知出货状态默认只允许无补件', () => {
            const result = ReplacementManager.getAllowedReplacementStatuses('unknown');
            expect(result).toEqual(['none']);
        });
    });

    describe('validateStatusCompatibility', () => {
        it('应该验证状态兼容性', () => {
            expect(ReplacementManager.validateStatusCompatibility('unshipped', 'none')).toBe(true);
            expect(ReplacementManager.validateStatusCompatibility('partial', 'partial')).toBe(true);
            expect(ReplacementManager.validateStatusCompatibility('shipped', 'partial')).toBe(true);
            expect(ReplacementManager.validateStatusCompatibility('shipped', 'full')).toBe(true);
        });

        it('应该拒绝不兼容的状态组合', () => {
            expect(ReplacementManager.validateStatusCompatibility('unshipped', 'partial')).toBe(false);
            expect(ReplacementManager.validateStatusCompatibility('unshipped', 'full')).toBe(false);
            expect(ReplacementManager.validateStatusCompatibility('partial', 'none')).toBe(false);
            expect(ReplacementManager.validateStatusCompatibility('partial', 'full')).toBe(false);
        });
    });

    describe('getReplacementStatusDetails', () => {
        it('应该返回正确的状态详情', () => {
            const details = ReplacementManager.getReplacementStatusDetails('partial');
            expect(details).toEqual({
                icon: '🔧',
                color: '#FFCA28',
                description: '部分补件'
            });
        });

        it('未知状态应该返回默认详情', () => {
            const details = ReplacementManager.getReplacementStatusDetails('unknown');
            expect(details).toEqual({
                icon: '🔧',
                color: '#90A4AE',
                description: '无补件需求'
            });
        });
    });

    describe('updateReplacementStatus', () => {
        let customerData;

        beforeEach(() => {
            customerData = {
                name: '测试客户',
                status: 'shipped',
                replacementStatus: 'none'
            };
        });

        it('应该正确更新补件状态', () => {
            const result = ReplacementManager.updateReplacementStatus(
                customerData,
                'partial',
                '测试用户',
                '部分补件测试'
            );

            expect(result.replacementStatus).toEqual('partial');
            expect(result.lastReplacementUpdate).toBeDefined();
            expect(Array.isArray(result.replacementHistory)).toBe(true);
            expect(result.replacementHistory.length).toBeGreaterThan(0);
        });

        it('应该拒绝无效的补件状态', () => {
            expect(() => {
                ReplacementManager.updateReplacementStatus(customerData, 'invalid', '测试用户');
            }).toThrow('无效的补件状态: invalid');
        });

        it('应该拒绝不兼容的状态组合', () => {
            customerData.status = 'unshipped';
            expect(() => {
                ReplacementManager.updateReplacementStatus(customerData, 'partial', '测试用户');
            }).toThrow('补件状态 partial 与出货状态 unshipped 不兼容');
        });

        it('应该正确初始化补件状态历史', () => {
            const result = ReplacementManager.updateReplacementStatus(
                customerData,
                'partial',
                '测试用户'
            );

            expect(result.replacementHistory).toHaveLength(2); // 初始状态 + 新状态
            expect(result.replacementHistory[0].status).toEqual('none');
            expect(result.replacementHistory[0].operator).toEqual('系统');
            expect(result.replacementHistory[1].status).toEqual('partial');
            expect(result.replacementHistory[1].operator).toEqual('测试用户');
        });

        it('应该正确记录状态变更历史', () => {
            customerData.replacementStatus = 'partial';
            const result = ReplacementManager.updateReplacementStatus(
                customerData,
                'full',
                '测试用户',
                '升级为全部补件'
            );

            const lastRecord = result.replacementHistory[result.replacementHistory.length - 1];
            expect(lastRecord.status).toEqual('full');
            expect(lastRecord.previousStatus).toEqual('partial');
            expect(lastRecord.operator).toEqual('测试用户');
            expect(lastRecord.reason).toEqual('升级为全部补件');
        });

        it('应该使用默认操作人员和原因', () => {
            const result = ReplacementManager.updateReplacementStatus(
                customerData,
                'partial'
            );

            const lastRecord = result.replacementHistory[result.replacementHistory.length - 1];
            expect(lastRecord.operator).toEqual('系统');
            expect(lastRecord.reason).toContain('补件状态从 none 变更为 partial');
        });
    });

    describe('calculateReplacementStatus', () => {
        it('未出货状态应该返回无补件', () => {
            const customerData = {
                status: 'unshipped',
                replacementStatus: 'partial'
            };

            const result = ReplacementManager.calculateReplacementStatus(customerData);
            expect(result).toEqual('none');
        });

        it('部分出货状态下的全部补件应该自动修正为部分补件', () => {
            const customerData = {
                status: 'partial',
                replacementStatus: 'full'
            };

            const result = ReplacementManager.calculateReplacementStatus(customerData);
            expect(result).toEqual('partial');
        });

        it('应该返回现有的补件状态', () => {
            const customerData = {
                status: 'shipped',
                replacementStatus: 'partial'
            };

            const result = ReplacementManager.calculateReplacementStatus(customerData);
            expect(result).toEqual('partial');
        });

        it('没有补件状态时应该返回无补件', () => {
            const customerData = {
                status: 'shipped'
            };

            const result = ReplacementManager.calculateReplacementStatus(customerData);
            expect(result).toEqual('none');
        });
    });
});