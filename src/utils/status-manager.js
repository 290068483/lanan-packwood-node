/**
 * 客户状态管理工具类
 * 根据客户数据和packages.json数据判断客户状态
 */

const fs = require('fs');
const path = require('path');

// 客户状态枚举
const CustomerStatus = {
  UNPACKED: '未打包',
  PROCESSING: '正在处理',
  PACKED: '已打包',
  ARCHIVED: '已归档',
  SHIPPED: '已出货',
  NOT_SHIPPED: '未出货'
};

// 状态颜色映射
const StatusColor = {
  [CustomerStatus.UNPACKED]: '#95a5a6', // 灰色
  [CustomerStatus.PROCESSING]: '#3498db', // 蓝色
  [CustomerStatus.PACKED]: '#f1c40f', // 黄色
  [CustomerStatus.ARCHIVED]: '#9b59b6', // 紫色
  [CustomerStatus.SHIPPED]: '#2ecc71', // 绿色
  [CustomerStatus.NOT_SHIPPED]: '#e67e22' // 橙色
};

/**
 * 检查客户打包状态
 * @param {Object} customerData - 客户数据
 * @param {Array} packagesData - packages.json数据
 * @returns {Object} 状态信息
 */
function checkPackStatus(customerData, packagesData) {
  // 1. 获取客户所有板件的ID
  let allPartIDs = [];
  if (customerData.panels && Array.isArray(customerData.panels)) {
    allPartIDs = customerData.panels.map(panel => panel.id);
  }

  // 如果没有板件数据，返回未打包状态
  if (allPartIDs.length === 0) {
    return {
      status: CustomerStatus.UNPACKED,
      packedCount: 0,
      totalParts: 0,
      packProgress: 0,
      packSeqs: []
    };
  }

  // 2. 从packages.json中提取所有partIDs
  const allPackedPartIDs = [];
  if (packagesData && Array.isArray(packagesData)) {
    packagesData.forEach(packageItem => {
      if (packageItem.partIDs && Array.isArray(packageItem.partIDs)) {
        allPackedPartIDs.push(...packageItem.partIDs);
      }
    });
  }

  // 3. 计算已打包的板件数
  let packedCount = 0;
  allPartIDs.forEach(partID => {
    if (allPackedPartIDs.includes(partID)) {
      packedCount++;
    }
  });

  // 4. 计算打包进度
  const packProgress = Math.round((packedCount / allPartIDs.length) * 100);

  // 5. 确定客户状态
  let status = CustomerStatus.UNPACKED;
  if (packProgress === 100) {
    status = CustomerStatus.PACKED;
  } else if (packProgress > 0) {
    status = CustomerStatus.PROCESSING;
  }

  // 6. 获取客户的所有包号
  const customerPackSeqs = [];
  if (packagesData && Array.isArray(packagesData)) {
    packagesData.forEach(packageItem => {
      if (packageItem.partIDs && Array.isArray(packageItem.partIDs)) {
        // 检查这个包是否包含客户的板件
        const hasCustomerParts = packageItem.partIDs.some(partID => allPartIDs.includes(partID));
        if (hasCustomerParts) {
          customerPackSeqs.push(packageItem.packSeq);
        }
      }
    });
  }

  return {
    status,
    packedCount,
    totalParts: allPartIDs.length,
    packProgress,
    packSeqs: customerPackSeqs
  };
}

/**
 * 获取客户状态颜色
 * @param {string} status - 客户状态
 * @returns {string} 颜色代码
 */
function getStatusColor(status) {
  return StatusColor[status] || '#95a5a6';
}

/**
 * 获取客户状态历史
 * @param {Object} customerData - 客户数据
 * @returns {Array} 状态历史数组
 */
function getStatusHistory(customerData) {
  return customerData.statusHistory || [];
}

/**
 * 添加状态历史记录
 * @param {Object} customerData - 客户数据
 * @param {string} status - 新状态
 * @param {string} operator - 操作人员
 * @param {string} remark - 备注
 * @returns {Object} 更新后的客户数据
 */
function addStatusHistory(customerData, status, operator = '系统', remark = '') {
  const now = new Date();
  const timestamp = now.toISOString();

  const newStatusHistory = [
    ...(customerData.statusHistory || []),
    {
      status,
      timestamp,
      operator,
      remark
    }
  ];

  return {
    ...customerData,
    statusHistory: newStatusHistory,
    lastStatusUpdate: timestamp
  };
}

/**
 * 更新客户状态
 * @param {Object} customerData - 客户数据
 * @param {string} status - 新状态
 * @param {string} operator - 操作人员
 * @param {string} remark - 备注
 * @returns {Object} 更新后的客户数据
 */
function updateCustomerStatus(customerData, status, operator = '系统', remark = '') {
  const updatedCustomer = addStatusHistory(customerData, status, operator, remark);

  // 根据状态更新特定字段
  switch (status) {
    case CustomerStatus.PACKED:
      updatedCustomer.packDate = new Date().toISOString();
      break;
    case CustomerStatus.ARCHIVED:
      updatedCustomer.archiveDate = new Date().toISOString();
      break;
    case CustomerStatus.SHIPPED:
      updatedCustomer.shipmentDate = new Date().toISOString();
      break;
  }

  return updatedCustomer;
}

module.exports = {
  CustomerStatus,
  checkPackStatus,
  getStatusColor,
  getStatusHistory,
  addStatusHistory,
  updateCustomerStatus
};
