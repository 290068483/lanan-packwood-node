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
    // 状态枚举（用于打包状态）
    this.STATUS = {
      NOT_PACKED: '未打包',
      IN_PROGRESS: '正在处理',
      PACKED: '已打包',
      PARTIAL_SHIPPED: '部分出货',
      FULL_SHIPPED: '全部出货',
      ARCHIVED: '已归档'
    };

    // 出货状态枚举
    this.SHIPMENT_STATUS = {
      NOT_SHIPPED: '未出货',
      PARTIAL_SHIPPED: '部分出货',
      FULL_SHIPPED: '全部出货'
    };

    // 补件状态枚举
    this.REPLACEMENT_STATUS = {
      NONE: '无补件',
      PENDING: '补件待处理',
      PROCESSING: '补件处理中',
      COMPLETED: '补件完成'
    };

    // 状态颜色映射
    this.STATUS_COLORS = {
      [this.STATUS.NOT_PACKED]: '#888888', // 灰色
      [this.STATUS.IN_PROGRESS]: '#2196F3', // 蓝色
      [this.STATUS.PACKED]: '#FFC107', // 黄色
      [this.STATUS.PARTIAL_SHIPPED]: '#FFCA28', // 橙色
      [this.STATUS.FULL_SHIPPED]: '#4CAF50', // 绿色
      [this.STATUS.ARCHIVED]: '#9C27B0' // 紫色
    };

    // 出货状态颜色映射
    this.SHIPMENT_STATUS_COLORS = {
      [this.SHIPMENT_STATUS.NOT_SHIPPED]: '#888888', // 灰色
      [this.SHIPMENT_STATUS.PARTIAL_SHIPPED]: '#FFCA28', // 橙色
      [this.SHIPMENT_STATUS.FULL_SHIPPED]: '#4CAF50' // 绿色
    };

    // 补件状态颜色映射
    this.REPLACEMENT_COLORS = {
      [this.REPLACEMENT_STATUS.NONE]: '#888888',        // 灰色
      [this.REPLACEMENT_STATUS.PENDING]: '#FF9800',     // 橙色
      [this.REPLACEMENT_STATUS.PROCESSING]: '#2196F3',  // 蓝色
      [this.REPLACEMENT_STATUS.COMPLETED]: '#4CAF50'    // 绿色
    };
  }

  /**
   * 检查客户打包状态
   * @param {Object} customerData - 客户数据
   * @param {Array} packagesData - packages.json数据
   * @returns {Object} - 状态信息
   */
  checkPackStatus(customerData, packagesData) {
    // 确保customerData和packagesData存在
    if (!customerData || !packagesData) {
      return {
        status: this.STATUS.NOT_PACKED,
        packProgress: 0,
        packedCount: 0,
        totalParts: 0,
        packSeqs: []
      };
    }

    // 确保customerData.panels存在且为数组
    const allPartIDs = customerData.panels ? customerData.panels.map(panel => panel.id) : [];

    // 确保packagesData是数组
    const validPackagesData = Array.isArray(packagesData) ? packagesData : [];

    // 确保customerData.packSeqs存在且为数组
    const existingPackSeqs = customerData.packSeqs ? customerData.packSeqs : [];
    // 2. 从packages.json中提取所有partIDs
    const allPackedPartIDs = [];
    const packageInfo = [];

    if (validPackagesData && Array.isArray(validPackagesData)) {
      validPackagesData.forEach(packageItem => {
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
    const packProgress = allPartIDs.length > 0 ? Math.round((packedCount / allPartIDs.length) * 100) : 0;

    // 5. 确定打包状态
    let status = this.STATUS.NOT_PACKED;
    if (packProgress === 100) {
      status = this.STATUS.PACKED;
    } else if (packProgress > 0) {
      status = this.STATUS.IN_PROGRESS;
    }

    // 6. 获取客户的所有包号
    const customerPackSeqs = [];
    if (validPackagesData && Array.isArray(validPackagesData)) {
      validPackagesData.forEach(packageItem => {
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
   * 更新客户状态（支持双状态）
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
        shipmentStatus: this.SHIPMENT_STATUS.NOT_SHIPPED,
        timestamp: new Date().toISOString(),
        operator: '系统',
        remark: '初始状态'
      });
    }

    // 更新打包状态相关字段
    if (statusInfo.status) {
      updatedData.status = statusInfo.status;
      updatedData.lastPackUpdate = statusInfo.timestamp;
    }

    // 更新出货状态相关字段
    if (statusInfo.shipmentStatus) {
      updatedData.shipmentStatus = statusInfo.shipmentStatus;
      updatedData.lastShipmentUpdate = statusInfo.timestamp;
    }

    // 更新打包进度相关字段
    updatedData.packedParts = statusInfo.packedCount || 0;
    updatedData.totalParts = statusInfo.totalParts || 0;
    updatedData.packSeqs = statusInfo.packSeqs || [];
    updatedData.packProgress = statusInfo.packProgress || 0;

    // 如果是第一次打包，记录打包时间
    if (statusInfo.status === this.STATUS.PACKED && !updatedData.packDate) {
      updatedData.packDate = statusInfo.timestamp;
    }

    // 如果是归档，记录归档时间
    if (statusInfo.status === this.STATUS.ARCHIVED && !updatedData.archiveDate) {
      updatedData.archiveDate = statusInfo.timestamp;
    }

    // 如果是出货，记录出货时间
    if ((statusInfo.shipmentStatus === this.SHIPMENT_STATUS.FULL_SHIPPED ||
      statusInfo.shipmentStatus === this.SHIPMENT_STATUS.PARTIAL_SHIPPED) &&
      !updatedData.shipmentDate) {
      updatedData.shipmentDate = statusInfo.timestamp;
    }

    // 添加到状态历史
    const statusChangeRecord = {
      status: statusInfo.status || updatedData.status,
      shipmentStatus: statusInfo.shipmentStatus || updatedData.shipmentStatus,
      previousStatus: customerData.status || this.STATUS.NOT_PACKED,
      previousShipmentStatus: customerData.shipmentStatus || this.SHIPMENT_STATUS.NOT_SHIPPED,
      timestamp: statusInfo.timestamp,
      operator,
      remark: remark || `状态变更为 ${statusInfo.status || updatedData.status}`,
      packProgress: statusInfo.packProgress || 0,
      packedParts: statusInfo.packedCount || 0,
      totalParts: statusInfo.totalParts || 0
    };

    updatedData.statusHistory.push(statusChangeRecord);

    return updatedData;
  }

  /**
   * 更新打包状态
   * @param {Object} customerData - 客户数据
   * @param {string} status - 打包状态
   * @param {string} operator - 操作人员
   * @param {string} remark - 备注
   * @returns {Object} - 更新后的客户数据
   */
  updatePackStatus(customerData, status, operator = '系统', remark = '') {
    // 验证打包状态值是否有效
    const validStatuses = Object.values(this.STATUS);
    if (!validStatuses.includes(status)) {
      throw new Error(`无效的打包状态。可选值: ${validStatuses.join(', ')}`);
    }

    const statusInfo = {
      status,
      shipmentStatus: customerData.shipmentStatus || this.SHIPMENT_STATUS.NOT_SHIPPED,
      packedCount: customerData.packedParts || 0,
      totalParts: customerData.totalParts || 0,
      packProgress: customerData.packProgress || 0,
      packSeqs: customerData.packSeqs || [],
      timestamp: new Date().toISOString()
    };

    return this.updateCustomerStatus(customerData, statusInfo, operator, remark);
  }

  /**
   * 更新出货状态
   * @param {Object} customerData - 客户数据
   * @param {string} shipmentStatus - 出货状态
   * @param {string} operator - 操作人员
   * @param {string} remark - 备注
   * @returns {Object} - 更新后的客户数据
   */
  updateShipmentStatus(customerData, shipmentStatus, operator = '系统', remark = '') {
    // 验证出货状态值是否有效
    const validShipmentStatuses = Object.values(this.SHIPMENT_STATUS);
    if (!validShipmentStatuses.includes(shipmentStatus)) {
      throw new Error(`无效的出货状态。可选值: ${validShipmentStatuses.join(', ')}`);
    }

    // 检查客户是否已开始打包（未打包状态不能出货）
    const currentStatus = customerData.status || this.STATUS.NOT_PACKED;
    if (currentStatus === this.STATUS.NOT_PACKED &&
      shipmentStatus !== this.SHIPMENT_STATUS.NOT_SHIPPED) {
      throw new Error('未打包的客户不能进行出货操作');
    }

    // 出货状态更新时，保持客户状态不变，只更新出货状态
    // 这样可以区分客户状态和出货状态，避免状态混淆
    const statusInfo = {
      status: customerData.status || this.STATUS.NOT_PACKED, // 保持原有客户状态
      shipmentStatus, // 只更新出货状态
      packedCount: customerData.packedParts || 0,
      totalParts: customerData.totalParts || 0,
      packProgress: customerData.packProgress || 0,
      packSeqs: customerData.packSeqs || [],
      timestamp: new Date().toISOString()
    };

    return this.updateCustomerStatus(customerData, statusInfo, operator, remark);
  }

  /**
   * 获取状态颜色
   * @param {string} status - 状态
   * @returns {string} - 颜色值
   */
  getStatusColor(status) {
    // 检查是否是传统状态
    if (this.STATUS_COLORS[status]) {
      return this.STATUS_COLORS[status];
    }

    // 默认返回灰色
    return '#999999';
  }

  /**
   * 获取出货状态颜色
   * @param {string} shipmentStatus - 出货状态
   * @returns {string} - 颜色值
   */
  getShipmentStatusColor(shipmentStatus) {
    return this.SHIPMENT_STATUS_COLORS[shipmentStatus] || '#999999';
  }

  /**
   * 获取补件状态颜色
   * @param {string} replacementStatus - 补件状态
   * @returns {string} - 颜色值
   */
  getReplacementStatusColor(replacementStatus) {
    return this.REPLACEMENT_COLORS[replacementStatus] || '#999999';
  }

  /**
   * 归档客户
   * @param {Object} customerData - 客户数据
   * @param {string} operator - 操作人员
   * @param {string} remark - 备注
   * @returns {Object} - 更新后的客户数据
   */
  archiveCustomer(customerData, operator = '系统', remark = '') {
    // 检查客户是否已打包
    const currentStatus = customerData.status || this.STATUS.NOT_PACKED;
    if (currentStatus !== this.STATUS.PACKED) {
      throw new Error('只有已打包的客户才能归档');
    }

    return this.updatePackStatus(customerData, this.STATUS.ARCHIVED, operator, remark || '客户归档');
  }

  /**
   * 全部出货
   * @param {Object} customerData - 客户数据
   * @param {string} operator - 操作人员
   * @param {string} remark - 备注
   * @returns {Object} - 更新后的客户数据
   */
  shipCustomer(customerData, operator = '系统', remark = '') {
    // 检查客户是否已打包或正在处理
    const currentStatus = customerData.status || this.STATUS.NOT_PACKED;
    if (currentStatus !== this.STATUS.PACKED && currentStatus !== this.STATUS.IN_PROGRESS) {
      throw new Error('只有已打包或正在处理的客户才能出货');
    }

    return this.updateShipmentStatus(customerData, this.SHIPMENT_STATUS.FULL_SHIPPED, operator, remark || '全部出货');
  }

  /**
   * 部分出货
   * @param {Object} customerData - 客户数据
   * @param {string} operator - 操作人员
   * @param {string} remark - 备注
   * @returns {Object} - 更新后的客户数据
   */
  partialShipCustomer(customerData, operator = '系统', remark = '') {
    // 检查客户是否已打包或正在处理
    const currentStatus = customerData.status || this.STATUS.NOT_PACKED;
    if (currentStatus !== this.STATUS.PACKED && currentStatus !== this.STATUS.IN_PROGRESS) {
      throw new Error('只有已打包或正在处理的客户才能部分出货');
    }

    return this.updateShipmentStatus(customerData, this.SHIPMENT_STATUS.PARTIAL_SHIPPED, operator, remark || '部分出货');
  }

  /**
   * 标记客户未出货
   * @param {Object} customerData - 客户数据
   * @param {string} operator - 操作人员
   * @param {string} remark - 备注
   * @returns {Object} - 更新后的客户数据
   */
  markCustomerNotShipped(customerData, operator = '系统', remark = '') {
    return this.updateShipmentStatus(customerData, this.SHIPMENT_STATUS.NOT_SHIPPED, operator, remark || '标记为未出货');
  }

  /**
   * 更新补件状态
   * @param {Object} customerData - 客户数据
   * @param {string} replacementStatus - 补件状态
   * @param {string} operator - 操作人员
   * @param {string} remark - 备注
   * @returns {Object} - 更新后的客户数据
   */
  updateReplacementStatus(customerData, replacementStatus, operator = '系统', remark = '') {
    // 验证补件状态值是否有效
    const validReplacementStatuses = Object.values(this.REPLACEMENT_STATUS);
    if (!validReplacementStatuses.includes(replacementStatus)) {
      throw new Error(`无效的补件状态。可选值: ${validReplacementStatuses.join(', ')}`);
    }

    // 创建客户数据的副本
    const updatedData = { ...customerData };

    // 更新补件状态
    updatedData.replacementStatus = replacementStatus;
    updatedData.lastReplacementUpdate = new Date().toISOString();

    // 确保状态历史存在
    if (!updatedData.statusHistory) {
      updatedData.statusHistory = [];
    }

    // 添加到状态历史
    const statusChangeRecord = {
      status: updatedData.status || this.STATUS.NOT_PACKED,
      shipmentStatus: updatedData.shipmentStatus || this.SHIPMENT_STATUS.NOT_SHIPPED,
      previousStatus: updatedData.status || this.STATUS.NOT_PACKED,
      previousShipmentStatus: updatedData.shipmentStatus || this.SHIPMENT_STATUS.NOT_SHIPPED,
      timestamp: updatedData.lastReplacementUpdate,
      operator,
      remark: remark || `补件状态变更为 ${replacementStatus}`,
      replacementStatus: replacementStatus,
      previousReplacementStatus: customerData.replacementStatus || this.REPLACEMENT_STATUS.NONE
    };

    updatedData.statusHistory.push(statusChangeRecord);

    return updatedData;
  }

  /**
   * 获取补件状态颜色
   * @param {string} status - 补件状态
   * @returns {string} - 颜色代码
   */
  getReplacementColor(status) {
    return this.REPLACEMENT_COLORS[status] || '#888888';
  }
}

// 创建全局实例
const customerStatusManager = new CustomerStatusManager();

module.exports = customerStatusManager;