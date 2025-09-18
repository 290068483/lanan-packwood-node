/**
 * 客户状态管理工具类的单元测试
 */

const fs = require('fs');
const path = require('path');
const { 
  CustomerStatus, 
  checkPackStatus, 
  getStatusColor, 
  getStatusHistory, 
  addStatusHistory, 
  updateCustomerStatus 
} = require('../src/utils/status-manager');

describe('客户状态管理工具类', () => {
  // 测试客户状态枚举
  test('客户状态枚举应该包含所有状态', () => {
    expect(CustomerStatus).toEqual({
      UNPACKED: '未打包',
      PROCESSING: '正在处理',
      PACKED: '已打包',
      ARCHIVED: '已归档',
      SHIPPED: '已出货',
      NOT_SHIPPED: '未出货'
    });
  });

  // 测试状态颜色映射
  test('状态颜色映射应该返回正确的颜色代码', () => {
    expect(getStatusColor(CustomerStatus.UNPACKED)).toBe('#95a5a6');
    expect(getStatusColor(CustomerStatus.PROCESSING)).toBe('#3498db');
    expect(getStatusColor(CustomerStatus.PACKED)).toBe('#f1c40f');
    expect(getStatusColor(CustomerStatus.ARCHIVED)).toBe('#9b59b6');
    expect(getStatusColor(CustomerStatus.SHIPPED)).toBe('#2ecc71');
    expect(getStatusColor(CustomerStatus.NOT_SHIPPED)).toBe('#e67e22');
  });

  // 测试状态判断算法 - 未打包状态
  test('当客户没有板件数据时，应该返回未打包状态', () => {
    const customerData = {};
    const packagesData = [];
    const result = checkPackStatus(customerData, packagesData);

    expect(result.status).toBe(CustomerStatus.UNPACKED);
    expect(result.packedCount).toBe(0);
    expect(result.totalParts).toBe(0);
    expect(result.packProgress).toBe(0);
    expect(result.packSeqs).toEqual([]);
  });

  // 测试状态判断算法 - 未打包状态（有板件但未打包）
  test('当客户有板件数据但未在packages.json中找到对应记录时，应该返回未打包状态', () => {
    const customerData = {
      panels: [
        { id: 'part1' },
        { id: 'part2' },
        { id: 'part3' }
      ]
    };
    const packagesData = [];
    const result = checkPackStatus(customerData, packagesData);

    expect(result.status).toBe(CustomerStatus.UNPACKED);
    expect(result.packedCount).toBe(0);
    expect(result.totalParts).toBe(3);
    expect(result.packProgress).toBe(0);
    expect(result.packSeqs).toEqual([]);
  });

  // 测试状态判断算法 - 正在处理状态
  test('当客户部分板件在packages.json中找到对应记录时，应该返回正在处理状态', () => {
    const customerData = {
      panels: [
        { id: 'part1' },
        { id: 'part2' },
        { id: 'part3' },
        { id: 'part4' }
      ]
    };
    const packagesData = [
      {
        packSeq: '1',
        packNo: '1110953111252',
        partIDs: ['part1', 'part2']
      }
    ];
    const result = checkPackStatus(customerData, packagesData);

    expect(result.status).toBe(CustomerStatus.PROCESSING);
    expect(result.packedCount).toBe(2);
    expect(result.totalParts).toBe(4);
    expect(result.packProgress).toBe(50);
    expect(result.packSeqs).toEqual(['1']);
  });

  // 测试状态判断算法 - 已打包状态
  test('当客户所有板件都在packages.json中找到对应记录时，应该返回已打包状态', () => {
    const customerData = {
      panels: [
        { id: 'part1' },
        { id: 'part2' },
        { id: 'part3' }
      ]
    };
    const packagesData = [
      {
        packSeq: '1',
        packNo: '1110953111252',
        partIDs: ['part1', 'part2']
      },
      {
        packSeq: '2',
        packNo: '1110953111253',
        partIDs: ['part3']
      }
    ];
    const result = checkPackStatus(customerData, packagesData);

    expect(result.status).toBe(CustomerStatus.PACKED);
    expect(result.packedCount).toBe(3);
    expect(result.totalParts).toBe(3);
    expect(result.packProgress).toBe(100);
    expect(result.packSeqs).toEqual(['1', '2']);
  });

  // 测试状态历史记录功能
  test('获取客户状态历史应该返回空数组当没有历史记录时', () => {
    const customerData = {};
    const history = getStatusHistory(customerData);

    expect(history).toEqual([]);
  });

  test('获取客户状态历史应该返回历史记录数组', () => {
    const customerData = {
      statusHistory: [
        {
          status: CustomerStatus.UNPACKED,
          timestamp: '2023-01-01 10:00:00',
          operator: '系统',
          remark: '初始状态'
        },
        {
          status: CustomerStatus.PACKED,
          timestamp: '2023-01-02 10:00:00',
          operator: '系统',
          remark: '打包完成'
        }
      ]
    };
    const history = getStatusHistory(customerData);

    expect(history).toHaveLength(2);
    expect(history[0].status).toBe(CustomerStatus.UNPACKED);
    expect(history[1].status).toBe(CustomerStatus.PACKED);
  });

  // 测试添加状态历史记录功能
  test('添加状态历史记录应该返回更新后的客户数据', () => {
    const customerData = {
      statusHistory: [
        {
          status: CustomerStatus.UNPACKED,
          timestamp: '2023-01-01 10:00:00',
          operator: '系统',
          remark: '初始状态'
        }
      ]
    };
    const updatedCustomer = addStatusHistory(
      customerData, 
      CustomerStatus.PACKED, 
      '测试用户', 
      '测试备注'
    );

    expect(updatedCustomer.statusHistory).toHaveLength(2);
    expect(updatedCustomer.statusHistory[1].status).toBe(CustomerStatus.PACKED);
    expect(updatedCustomer.statusHistory[1].operator).toBe('测试用户');
    expect(updatedCustomer.statusHistory[1].remark).toBe('测试备注');
    expect(updatedCustomer.lastStatusUpdate).toBeDefined();
  });

  // 测试更新客户状态功能
  test('更新客户状态应该返回更新后的客户数据', () => {
    const customerData = {
      status: CustomerStatus.UNPACKED,
      statusHistory: [
        {
          status: CustomerStatus.UNPACKED,
          timestamp: '2023-01-01 10:00:00',
          operator: '系统',
          remark: '初始状态'
        }
      ],
      lastStatusUpdate: '2023-01-01 10:00:00'
    };
    const updatedCustomer = updateCustomerStatus(
      customerData, 
      CustomerStatus.PACKED, 
      '测试用户', 
      '测试备注'
    );

    expect(updatedCustomer.status).toBe(CustomerStatus.PACKED);
    expect(updatedCustomer.statusHistory).toHaveLength(2);
    expect(updatedCustomer.statusHistory[1].status).toBe(CustomerStatus.PACKED);
    expect(updatedCustomer.statusHistory[1].operator).toBe('测试用户');
    expect(updatedCustomer.statusHistory[1].remark).toBe('测试备注');
    expect(updatedCustomer.packDate).toBeDefined();
    expect(updatedCustomer.lastStatusUpdate).not.toBe(customerData.lastStatusUpdate);
  });
});
