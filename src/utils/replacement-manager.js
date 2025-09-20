/**
 * 补件状态管理器
 * 用于管理客户补件状态和补件操作
 */

const fs = require('fs');
const path = require('path');

// 补件状态枚举
const ReplacementStatus = {
  NONE: 'none',        // 无补件
  PARTIAL: 'partial',  // 部分补件
  FULL: 'full'         // 全部补件
};

// 补件状态详情
const ReplacementStatusDetails = {
  [ReplacementStatus.NONE]: {
    icon: '🔧',
    color: '#90A4AE',  // 灰色
    description: '无补件需求'
  },
  [ReplacementStatus.PARTIAL]: {
    icon: '🔧',
    color: '#FFCA28',  // 橙色
    description: '部分补件'
  },
  [ReplacementStatus.FULL]: {
    icon: '🔧',
    color: '#EF5350',  // 红色
    description: '全部补件'
  }
};

/**
 * 验证补件状态是否有效
 * @param {string} status - 补件状态
 * @returns {boolean} 是否有效
 */
function validateReplacementStatus(status) {
  return Object.values(ReplacementStatus).includes(status);
}

/**
 * 根据出货状态计算可允许的补件状态
 * @param {string} shippingStatus - 出货状态
 * @returns {Array} 允许的补件状态数组
 */
function getAllowedReplacementStatuses(shippingStatus) {
  switch (shippingStatus) {
    case 'unshipped':
      return [ReplacementStatus.NONE];
    case 'partial':
      return [ReplacementStatus.PARTIAL];
    case 'shipped':
      return [ReplacementStatus.PARTIAL, ReplacementStatus.FULL];
    default:
      return [ReplacementStatus.NONE];
  }
}

/**
 * 验证补件状态与出货状态的兼容性
 * @param {string} shippingStatus - 出货状态
 * @param {string} replacementStatus - 补件状态
 * @returns {boolean} 是否兼容
 */
function validateStatusCompatibility(shippingStatus, replacementStatus) {
  const allowedStatuses = getAllowedReplacementStatuses(shippingStatus);
  return allowedStatuses.includes(replacementStatus);
}

/**
 * 获取补件状态详情
 * @param {string} status - 补件状态
 * @returns {Object} 状态详情
 */
function getReplacementStatusDetails(status) {
  return ReplacementStatusDetails[status] || ReplacementStatusDetails[ReplacementStatus.NONE];
}

/**
 * 更新客户补件状态
 * @param {Object} customerData - 客户数据
 * @param {string} replacementStatus - 新的补件状态
 * @param {string} operator - 操作人员
 * @param {string} reason - 补件原因
 * @returns {Object} 更新后的客户数据
 */
function updateReplacementStatus(customerData, replacementStatus, operator = '系统', reason = '') {
  // 验证补件状态
  if (!validateReplacementStatus(replacementStatus)) {
    throw new Error(`无效的补件状态: ${replacementStatus}`);
  }

  // 验证状态兼容性
  if (!validateStatusCompatibility(customerData.status, replacementStatus)) {
    throw new Error(`补件状态 ${replacementStatus} 与出货状态 ${customerData.status} 不兼容`);
  }

  // 创建客户数据的副本
  const updatedData = { ...customerData };

  // 确保补件状态历史存在
  if (!updatedData.replacementHistory) {
    updatedData.replacementHistory = [];
  }

  // 添加初始补件状态记录（如果这是第一次设置补件状态）
  if (updatedData.replacementHistory.length === 0) {
    updatedData.replacementHistory.push({
      status: ReplacementStatus.NONE,
      timestamp: new Date().toISOString(),
      operator: '系统',
      reason: '初始状态'
    });
  }

  // 更新补件状态相关字段
  updatedData.replacementStatus = replacementStatus;
  updatedData.lastReplacementUpdate = new Date().toISOString();

  // 添加到补件状态历史
  const replacementRecord = {
    status: replacementStatus,
    previousStatus: customerData.replacementStatus || ReplacementStatus.NONE,
    timestamp: new Date().toISOString(),
    operator,
    reason: reason || `补件状态从 ${customerData.replacementStatus || ReplacementStatus.NONE} 变更为 ${replacementStatus}`
  };

  updatedData.replacementHistory.push(replacementRecord);

  return updatedData;
}

/**
 * 计算客户补件状态
 * @param {Object} customerData - 客户数据
 * @returns {string} 补件状态
 */
function calculateReplacementStatus(customerData) {
  // 未出货状态不可有补件
  if (customerData.status === 'unshipped') {
    return ReplacementStatus.NONE;
  }
  
  // 部分出货状态只能有部分补件
  if (customerData.status === 'partial' && customerData.replacementStatus === ReplacementStatus.FULL) {
    return ReplacementStatus.PARTIAL; // 自动修正为部分补件
  }
  
  return customerData.replacementStatus || ReplacementStatus.NONE;
}

module.exports = {
  ReplacementStatus,
  ReplacementStatusDetails,
  validateReplacementStatus,
  getAllowedReplacementStatuses,
  validateStatusCompatibility,
  getReplacementStatusDetails,
  updateReplacementStatus,
  calculateReplacementStatus
};