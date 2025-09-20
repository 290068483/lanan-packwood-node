const customerStatusManager = require('../src/utils/customer-status-manager');
const { ReplacementStatus } = require('../src/utils/replacement-manager');

describe('CustomerStatusManager', () => {
  describe('状态枚举', () => {
    test('应该包含所有正确的状态值', () => {
      expect(customerStatusManager.STATUS).toEqual({
        NOT_PACKED: '未打包',
        IN_PROGRESS: '正在处理',
        PACKED: '已打包',
        ARCHIVED: '已归档',
        SHIPPED: '全部出货',
        PARTIAL_SHIPPED: '部分出货',
        NOT_SHIPPED: '未出货'
      });
    });
  });

  describe('状态颜色映射', () => {
    test('应该包含所有状态的颜色映射', () => {
      expect(customerStatusManager.STATUS_COLORS).toEqual({
        '未打包': '#888888',
        '正在处理': '#2196F3',
        '已打包': '#FFC107',
        '已归档': '#9C27B0',
        '全部出货': '#4CAF50',
        '部分出货': '#FFCA28',
        '未出货': '#FF9800'
      });
    });
  });

  describe('checkPackStatus', () => {
    test('应该正确处理空数据', () => {
      const result = customerStatusManager.checkPackStatus(null, null);
      expect(result).toEqual({
        status: '未打包',
        packProgress: 0,
        packedParts: 0,
        totalParts: 0,
        packSeqs: []
      });
    });

    test('应该正确计算打包进度', () => {
      const customerData = {
        panels: [
          { id: 'part1' },
          { id: 'part2' },
          { id: 'part3' }
        ]
      };

      const packagesData = [
        {
          partIDs: ['part1', 'part2'],
          packSeq: '001'
        }
      ];

      const result = customerStatusManager.checkPackStatus(customerData, packagesData);
      expect(result.packedCount).toBe(2);
      expect(result.totalParts).toBe(3);
      expect(result.packProgress).toBe(67); // 2/3 四舍五入
      expect(result.status).toBe('正在处理');
    });

    test('应该正确识别已打包状态', () => {
      const customerData = {
        panels: [
          { id: 'part1' },
          { id: 'part2' }
        ]
      };

      const packagesData = [
        {
          partIDs: ['part1', 'part2'],
          packSeq: '001'
        }
      ];

      const result = customerStatusManager.checkPackStatus(customerData, packagesData);
      expect(result.packProgress).toBe(100);
      expect(result.status).toBe('已打包');
    });
  });

  describe('归档操作', () => {
    test('不应该归档未打包的客户', () => {
      const customerData = {
        status: '未打包'
      };

      expect(() => {
        customerStatusManager.archiveCustomer(customerData, '测试操作员', '测试备注');
      }).toThrow('只有已打包的客户才能进行归档');
    });
  });

  describe('出货操作', () => {
    const baseCustomerData = {
      packedParts: 5,
      totalParts: 5,
      packProgress: 100,
      packSeqs: ['001']
    };

    test('不应该出货未打包的客户', () => {
      const customerData = {
        ...baseCustomerData,
        status: '未打包'
      };

      expect(() => {
        customerStatusManager.shipCustomer(customerData, '测试操作员', '测试备注');
      }).toThrow('只有已打包或正在处理的客户才能进行出货');
    });
  });

  describe('补件状态更新', () => {
    test('应该能够更新客户补件状态', () => {
      const customerData = {
        name: '测试客户',
        replacementStatus: '无补件'
      };

      const updatedCustomer = customerStatusManager.updateReplacementStatus(
        customerData,
        '补件待处理',
        '测试操作员',
        '测试备注'
      );

      expect(updatedCustomer.replacementStatus).toBe('补件待处理');
      expect(updatedCustomer.replacementHistory).toBeDefined();
      expect(updatedCustomer.replacementHistory.length).toBeGreaterThan(0);
    });
  });
});