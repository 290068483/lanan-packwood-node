const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

/**
 * 客户状态管理器
 * 用于管理客户状态和状态变更历史
 */
class CustomerStatusManager {
  /**
   * 构造函数
   */
  constructor() {
    // 状态枚举
    this.STATUS = {
      NOT_PACKED: '未打包',
      IN_PROGRESS: '正在处理',
      PACKED: '已打包',
      ARCHIVED: '已归档',
      SHIPPED: '已出货',
      NOT_SHIPPED: '未出货'
    };

    // 状态颜色映射
    this.STATUS_COLORS = {
      [this.STATUS.NOT_PACKED]: '#888888', // 灰色
      [this.STATUS.IN_PROGRESS]: '#2196F3', // 蓝色
      [this.STATUS.PACKED]: '#FFC107', // 黄色
      [this.STATUS.ARCHIVED]: '#9C27B0', // 紫色
      [this.STATUS.SHIPPED]: '#4CAF50', // 绿色
      [this.STATUS.NOT_SHIPPED]: '#FF9800' // 橙色
    };
  }

  /**
   * 检查客户打包状态
   * @param {Object} customerData - 客户数据
   * @param {Array} packagesData - packages.json数据
   * @returns {Object} - 状态信息
   */
  checkPackStatus(customerData, packagesData) {
    // 1. 获取客户所有板件的ID
    const allPartIDs = customerData.panels.map(panel => panel.id);

    // 2. 从packages.json中提取所有partIDs
    const allPackedPartIDs = [];
    const packageInfo = [];

    if (packagesData && Array.isArray(packagesData)) {
      packagesData.forEach(packageItem => {
        if (packageItem.partIDs && Array.isArray(packageItem.partIDs)) {
          allPackedPartIDs.push(...packageItem.partIDs);
          packageInfo.push({
            packSeq: packageItem.packSeq || '',
            packNo: packageItem.packNo || '',
            packDate: packageItem.packDate || '',
            partIDs: packageItem.partIDs || []
          });
        }
      });
    }

    // 3. 计算已打包的板件数
    let packedCount = 0;
    const matchedParts = [];
    const unmatchedParts = [];

    allPartIDs.forEach(partID => {
      if (allPackedPartIDs.includes(partID)) {
        packedCount++;
        matchedParts.push(partID);
      } else {
        unmatchedParts.push(partID);
      }
    });

    // 4. 计算打包进度
    const packProgress = Math.round((packedCount / allPartIDs.length) * 100);

    // 5. 确定客户状态
    let status = this.STATUS.NOT_PACKED;
    if (packProgress === 100) {
      status = this.STATUS.PACKED;
    } else if (packProgress > 0) {
      status = this.STATUS.IN_PROGRESS;
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
      packSeqs: customerPackSeqs,
      packageInfo,
      matchedParts,
      unmatchedParts,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * 更新客户打包状态
   * @param {Object} customerData - 客户数据
   * @param {Object} statusInfo - 状态信息
   * @param {string} operator - 操作人员
   * @param {string} remark - 备注
   * @returns {Object} - 更新后的客户数据
   */
  updateCustomerStatus(customerData, statusInfo, operator = '系统', remark = '') {
    // 创建客户数据的副本
    const updatedData = { ...customerData };

    // 确保状态历史存在
    if (!updatedData.statusHistory) {
      updatedData.statusHistory = [];
    }

    // 添加初始状态记录（如果这是第一次状态更新）
    if (updatedData.statusHistory.length === 0) {
      updatedData.statusHistory.push({
        status: this.STATUS.NOT_PACKED,
        timestamp: new Date().toISOString(),
        operator: '系统',
        remark: '初始状态'
      });
    }

    // 更新状态相关字段
    updatedData.status = statusInfo.status;
    updatedData.lastStatusUpdate = statusInfo.timestamp;
    updatedData.packedParts = statusInfo.packedCount;
    updatedData.totalParts = statusInfo.totalParts;
    updatedData.packSeqs = statusInfo.packSeqs;
    updatedData.lastPackCheck = statusInfo.timestamp;

    // 如果是第一次打包，记录打包时间
    if (statusInfo.status === this.STATUS.PACKED && !updatedData.packDate) {
      updatedData.packDate = statusInfo.timestamp;
    }

    // 如果是归档，记录归档时间
    if (statusInfo.status === this.STATUS.ARCHIVED && !updatedData.archiveDate) {
      updatedData.archiveDate = statusInfo.timestamp;
    }

    // 如果是出货，记录出货时间
    if (statusInfo.status === this.STATUS.SHIPPED && !updatedData.shipmentDate) {
      updatedData.shipmentDate = statusInfo.timestamp;
    }

    // 添加到状态历史
    const statusChangeRecord = {
      status: statusInfo.status,
      previousStatus: customerData.status || this.STATUS.NOT_PACKED,
      timestamp: statusInfo.timestamp,
      operator,
      remark: remark || `状态从 ${customerData.status || this.STATUS.NOT_PACKED} 变更为 ${statusInfo.status}`,
      packProgress: statusInfo.packProgress,
      packedParts: statusInfo.packedCount,
      totalParts: statusInfo.totalParts
    };

    updatedData.statusHistory.push(statusChangeRecord);

    return updatedData;
  }

  /**
   * 获取状态颜色
   * @param {string} status - 状态
   * @returns {string} - 颜色代码
   */
  getStatusColor(status) {
    return this.STATUS_COLORS[status] || '#888888';
  }

  /**
   * 归档客户
   * @param {Object} customerData - 客户数据
   * @param {string} operator - 操作人员
   * @param {string} remark - 备注
   * @returns {Object} - 更新后的客户数据
   */
  archiveCustomer(customerData, operator = '系统', remark = '') {
    if (customerData.status !== this.STATUS.PACKED) {
      throw new Error('只有已打包的客户才能进行归档');
    }

    const statusInfo = {
      status: this.STATUS.ARCHIVED,
      packedCount: customerData.packedParts || 0,
      totalParts: customerData.totalParts || 0,
      packProgress: customerData.packProgress || 0,
      packSeqs: customerData.packSeqs || [],
      timestamp: new Date().toISOString()
    };

    return this.updateCustomerStatus(customerData, statusInfo, operator, remark);
  }

  /**
   * 出货客户
   * @param {Object} customerData - 客户数据
   * @param {string} operator - 操作人员
   * @param {string} remark - 备注
   * @returns {Object} - 更新后的客户数据
   */
  shipCustomer(customerData, operator = '系统', remark = '') {
    if (customerData.status !== this.STATUS.ARCHIVED) {
      throw new Error('只有已归档的客户才能进行出货');
    }

    const statusInfo = {
      status: this.STATUS.SHIPPED,
      packedCount: customerData.packedParts || 0,
      totalParts: customerData.totalParts || 0,
      packProgress: customerData.packProgress || 0,
      packSeqs: customerData.packSeqs || [],
      timestamp: new Date().toISOString()
    };

    return this.updateCustomerStatus(customerData, statusInfo, operator, remark);
  }

  /**
   * 标记客户为未出货
   * @param {Object} customerData - 客户数据
   * @param {string} operator - 操作人员
   * @param {string} remark - 备注
   * @returns {Object} - 更新后的客户数据
   */
  markCustomerNotShipped(customerData, operator = '系统', remark = '') {
    if (customerData.status !== this.STATUS.ARCHIVED) {
      throw new Error('只有已归档的客户才能标记为未出货');
    }

    const statusInfo = {
      status: this.STATUS.NOT_SHIPPED,
      packedCount: customerData.packedParts || 0,
      totalParts: customerData.totalParts || 0,
      packProgress: customerData.packProgress || 0,
      packSeqs: customerData.packSeqs || [],
      timestamp: new Date().toISOString()
    };

    return this.updateCustomerStatus(customerData, statusInfo, operator, remark);
  }
}

// 创建全局实例
const customerStatusManager = new CustomerStatusManager();

module.exports = customerStatusManager;
