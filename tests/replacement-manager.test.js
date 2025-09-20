const {
  ReplacementStatus,
  ReplacementStatusDetails,
  validateReplacementStatus,
  getAllowedReplacementStatuses,
  validateStatusCompatibility,
  getReplacementStatusDetails,
  updateReplacementStatus,
  calculateReplacementStatus
} = require('../src/utils/replacement-manager');

describe('ReplacementManager', () => {
  describe('ReplacementStatus 枚举', () => {
    test('应该定义正确的补件状态枚举', () => {
      expect(ReplacementStatus).toEqual({
        NONE: 'none',
        PARTIAL: 'partial',
        FULL: 'full'
      });
    });
  });

  describe('ReplacementStatusDetails 状态详情', () => {
    test('应该包含所有状态的详细信息', () => {
      expect(ReplacementStatusDetails).toEqual({
        [ReplacementStatus.NONE]: {
          icon: '🔧',
          color: '#90A4AE',
          description: '无补件需求'
        },
        [ReplacementStatus.PARTIAL]: {
          icon: '🔧',
          color: '#FFCA28',
          description: '部分补件'
        },
        [ReplacementStatus.FULL]: {
          icon: '🔧',
          color: '#EF5350',
          description: '全部补件'
        }
      });
    });
  });

  describe('validateReplacementStatus', () => {
    test('应该验证有效的补件状态', () => {
      expect(validateReplacementStatus('none')).toBe(true);
      expect(validateReplacementStatus('partial')).toBe(true);
      expect(validateReplacementStatus('full')).toBe(true);
    });

    test('应该拒绝无效的补件状态', () => {
      expect(validateReplacementStatus('invalid')).toBe(false);
      expect(validateReplacementStatus(null)).toBe(false);
      expect(validateReplacementStatus(undefined)).toBe(false);
    });
  });

  describe('getAllowedReplacementStatuses', () => {
    test('应该为未出货状态返回正确的允许补件状态', () => {
      const result = getAllowedReplacementStatuses('unshipped');
      expect(result).toEqual(['none']);
    });

    test('应该为部分出货状态返回正确的允许补件状态', () => {
      const result = getAllowedReplacementStatuses('partial');
      expect(result).toEqual(['partial']);
    });

    test('应该为全部出货状态返回正确的允许补件状态', () => {
      const result = getAllowedReplacementStatuses('shipped');
      expect(result).toEqual(['partial', 'full']);
    });

    test('应该为未知出货状态返回默认允许补件状态', () => {
      const result = getAllowedReplacementStatuses('unknown');
      expect(result).toEqual(['none']);
    });
  });

  describe('validateStatusCompatibility', () => {
    test('应该验证未出货状态与无补件状态的兼容性', () => {
      expect(validateStatusCompatibility('unshipped', 'none')).toBe(true);
    });

    test('应该验证部分出货状态与部分补件状态的兼容性', () => {
      expect(validateStatusCompatibility('partial', 'partial')).toBe(true);
    });

    test('应该验证全部出货状态与全部补件状态的兼容性', () => {
      expect(validateStatusCompatibility('shipped', 'full')).toBe(true);
    });

    test('应该拒绝部分出货状态与全部补件状态的兼容性', () => {
      expect(validateStatusCompatibility('partial', 'full')).toBe(false);
    });
  });

  describe('getReplacementStatusDetails', () => {
    test('应该返回有效的补件状态详情', () => {
      const result = getReplacementStatusDetails('partial');
      expect(result).toEqual({
        icon: '🔧',
        color: '#FFCA28',
        description: '部分补件'
      });
    });

    test('应该为无效状态返回无补件详情', () => {
      const result = getReplacementStatusDetails('invalid');
      expect(result).toEqual({
        icon: '🔧',
        color: '#90A4AE',
        description: '无补件需求'
      });
    });
  });

  describe('updateReplacementStatus', () => {
    test('应该更新客户补件状态', () => {
      const customerData = {
        status: 'shipped',
        replacementStatus: 'none'
      };

      const result = updateReplacementStatus(customerData, 'partial', '测试操作员', '测试原因');
      
      expect(result.replacementStatus).toBe('partial');
      expect(result.replacementHistory).toBeDefined();
      expect(result.replacementHistory.length).toBeGreaterThan(0);
    });

    test('应该拒绝无效的补件状态', () => {
      const customerData = {
        status: 'shipped',
        replacementStatus: 'none'
      };

      expect(() => {
        updateReplacementStatus(customerData, 'invalid', '测试操作员', '测试原因');
      }).toThrow('无效的补件状态: invalid');
    });

    test('应该拒绝不兼容的状态组合', () => {
      const customerData = {
        status: 'partial',
        replacementStatus: 'none'
      };

      expect(() => {
        updateReplacementStatus(customerData, 'full', '测试操作员', '测试原因');
      }).toThrow('补件状态 full 与出货状态 partial 不兼容');
    });
  });

  describe('calculateReplacementStatus', () => {
    test('应该为未出货客户计算补件状态', () => {
      const customerData = {
        status: 'unshipped',
        replacementStatus: 'partial'
      };

      const result = calculateReplacementStatus(customerData);
      expect(result).toBe('none');
    });

    test('应该自动修正部分出货客户的全部补件状态', () => {
      const customerData = {
        status: 'partial',
        replacementStatus: 'full'
      };

      const result = calculateReplacementStatus(customerData);
      expect(result).toBe('partial');
    });

    test('应该保持兼容的补件状态', () => {
      const customerData = {
        status: 'shipped',
        replacementStatus: 'full'
      };

      const result = calculateReplacementStatus(customerData);
      expect(result).toBe('full');
    });
  });
});