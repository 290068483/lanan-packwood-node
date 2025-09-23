const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const customerStatusManager = require('../../utils/customer-status-manager');

// 数据文件路径
const DATABASE_PATH = path.join(__dirname, '../../data/database.json');
const PANELS_PATH = path.join(__dirname, '../../data/panels.json');
const HISTORY_PATH = path.join(__dirname, '../../data/history.json');

/**
 * 客户数据模型 - 文件系统版本
 */
class CustomerFS {
  // 静态数据路径，支持多环境配置
  static dataPath = DATABASE_PATH;
  static panelsPath = PANELS_PATH;
  static historyPath = HISTORY_PATH;

  /**
   * 构造函数
   */
  constructor() {
    this.dataPath = CustomerFS.dataPath;
    this.panelsPath = CustomerFS.panelsPath;
    this.historyPath = CustomerFS.historyPath;
    this.ensureDataFilesExist();
  }

  /**
   * 设置数据路径（静态方法，支持多环境配置）
   * @param {string} basePath - 基础数据路径
   */
  static setDataPath(basePath) {
    try {
      // 确保路径存在
      if (!fs.existsSync(basePath)) {
        fs.mkdirSync(basePath, { recursive: true });
        console.log(`✅ 创建数据目录: ${basePath}`);
      }

      // 更新静态路径
      CustomerFS.dataPath = path.join(basePath, 'database.json');
      CustomerFS.panelsPath = path.join(basePath, 'panels.json');
      CustomerFS.historyPath = path.join(basePath, 'history.json');

      console.log(`✅ 数据路径已更新到: ${basePath}`);
      return true;
    } catch (error) {
      console.error(`❌ 设置数据路径失败: ${error.message}`);
      return false;
    }
  }

  /**
   * 获取当前数据路径
   * @returns {Object} 当前数据路径对象
   */
  static getCurrentPaths() {
    return {
      dataPath: CustomerFS.dataPath,
      panelsPath: CustomerFS.panelsPath,
      historyPath: CustomerFS.historyPath
    };
  }

  /**
   * 确保数据文件存在
   */
  ensureDataFilesExist() {
    // 确保data目录存在
    const dataDir = path.dirname(this.dataPath);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    // 确保数据文件存在
    if (!fs.existsSync(this.dataPath)) {
      fs.writeFileSync(this.dataPath, JSON.stringify({
        customers: [],
        settings: {},
        history: []
      }, null, 2));
    }

    if (!fs.existsSync(this.panelsPath)) {
      fs.writeFileSync(this.panelsPath, JSON.stringify([], null, 2));
    }

    if (!fs.existsSync(this.historyPath)) {
      fs.writeFileSync(this.historyPath, JSON.stringify([], null, 2));
    }
  }

  /**
   * 读取数据文件
   * @returns {Object} - 数据对象
   */
  readDataFile() {
    try {
      const data = fs.readFileSync(this.dataPath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.error('读取数据文件失败:', error);
      return { customers: [], settings: {}, history: [] };
    }
  }

  /**
   * 写入数据文件
   * @param {Object} data - 数据对象
   */
  writeDataFile(data) {
    try {
      fs.writeFileSync(this.dataPath, JSON.stringify(data, null, 2));
    } catch (error) {
      console.error('写入数据文件失败:', error);
      throw error;
    }
  }

  /**
   * 读取panels数据
   * @returns {Array} - panels数据
   */
  readPanelsData() {
    try {
      const data = fs.readFileSync(this.panelsPath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.error('读取panels数据失败:', error);
      return [];
    }
  }

  /**
   * 写入panels数据
   * @param {Array} panels - panels数据
   */
  writePanelsData(panels) {
    try {
      fs.writeFileSync(this.panelsPath, JSON.stringify(panels, null, 2));
    } catch (error) {
      console.error('写入panels数据失败:', error);
      throw error;
    }
  }

  /**
   * 读取历史数据
   * @returns {Array} - 历史数据
   */
  readHistoryData() {
    try {
      const data = fs.readFileSync(this.historyPath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.error('读取历史数据失败:', error);
      return [];
    }
  }

  /**
   * 写入历史数据
   * @param {Array} history - 历史数据
   */
  writeHistoryData(history) {
    try {
      fs.writeFileSync(this.historyPath, JSON.stringify(history, null, 2));
    } catch (error) {
      console.error('写入历史数据失败:', error);
      throw error;
    }
  }

  /**
   * 创建或更新客户
   * @param {Object} customerData - 客户数据
   * @param {string} operator - 操作人员
   * @returns {Object} - 创建或更新后的客户数据
   */
  createOrUpdateCustomer(customerData, operator = '系统') {
    // 验证必要字段
    if (!customerData.name) {
      throw new Error('客户名称是必填项');
    }

    // 读取现有数据
    const data = this.readDataFile();
    const customers = data.customers || [];

    // 查找现有客户
    const existingCustomerIndex = customers.findIndex(c => c.name === customerData.name);

    // 生成客户ID（如果不存在）
    let customerId = customerData.id;
    if (!customerId) {
      customerId = crypto.randomUUID();
    }

    // 处理面板数据
    const panels = customerData.panels || [];
    const allPanels = this.readPanelsData();

    // 更新或创建客户对象
    let customer;
    if (existingCustomerIndex !== -1) {
      // 更新现有客户
      customer = {
        ...customers[existingCustomerIndex],
        ...customerData,
        id: customerId,
        updatedAt: new Date().toISOString()
      };

      // 更新客户列表
      customers[existingCustomerIndex] = customer;
    } else {
      // 创建新客户
      customer = {
        id: customerId,
        name: customerData.name,
        address: customerData.address || '',
        phone: customerData.phone || '',
        email: customerData.email || '',
        notes: customerData.notes || '',
        panels: panels,
        status: customerStatusManager.STATUS.NOT_PACKED,
        shipmentStatus: customerStatusManager.SHIPMENT_STATUS.NOT_SHIPPED,
        packProgress: 0,
        packedParts: 0,
        totalParts: panels.length,
        packSeqs: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        lastPackUpdate: new Date().toISOString(),
        lastShipmentUpdate: new Date().toISOString()
      };

      // 添加到客户列表
      customers.push(customer);
    }

    // 更新面板数据
    panels.forEach(panel => {
      if (!panel.customerId) {
        panel.customerId = customerId;
      }
      if (!panel.customerName) {
        panel.customerName = customerData.name;
      }

      // 查找现有面板
      const existingPanelIndex = allPanels.findIndex(p => p.id === panel.id);
      if (existingPanelIndex !== -1) {
        // 更新现有面板
        allPanels[existingPanelIndex] = {
          ...allPanels[existingPanelIndex],
          ...panel,
          customerId,
          customerName: customerData.name,
          updatedAt: new Date().toISOString()
        };
      } else {
        // 创建新面板
        if (!panel.id) {
          panel.id = crypto.randomUUID();
        }
        panel.customerId = customerId;
        panel.customerName = customerData.name;
        panel.createdAt = new Date().toISOString();
        panel.updatedAt = new Date().toISOString();
        allPanels.push(panel);
      }
    });

    // 保存数据
    this.writeDataFile({
      ...data,
      customers
    });
    this.writePanelsData(allPanels);

    return customer;
  }

  /**
   * 根据ID获取客户
   * @param {string} id - 客户ID
   * @returns {Object|null} - 客户数据或null
   */
  getCustomerById(id) {
    const data = this.readDataFile();
    const customers = data.customers || [];
    const customer = customers.find(c => c.id === id);

    if (!customer) {
      return null;
    }

    // 确保状态历史存在
    if (!customer.statusHistory) {
      customer.statusHistory = [];
    }

    // 添加初始状态记录（如果这是第一次状态更新）
    if (customer.statusHistory.length === 0) {
      customer.statusHistory.push({
        status: customerStatusManager.STATUS.NOT_PACKED,
        shipmentStatus: customerStatusManager.SHIPMENT_STATUS.NOT_SHIPPED,
        timestamp: new Date().toISOString(),
        operator: '系统',
        remark: '初始状态'
      });
    }

    // 确保状态字段存在
    const status = customer.status || customerStatusManager.STATUS.NOT_PACKED;
    const shipmentStatus = customer.shipmentStatus || customerStatusManager.SHIPMENT_STATUS.NOT_SHIPPED;

    // 返回客户数据副本
    return {
      ...customer,
      status,
      shipmentStatus,
      packedParts: customer.packedParts || 0,
      totalParts: customer.totalParts || 0,
      packProgress: customer.packProgress || 0,
      packSeqs: customer.packSeqs || [],
      lastPackUpdate: customer.lastPackUpdate || new Date().toISOString(),
      lastShipmentUpdate: customer.lastShipmentUpdate || new Date().toISOString()
    };
  }

  /**
   * 根据名称获取客户
   * @param {string} name - 客户名称
   * @returns {Object|null} - 客户数据或null
   */
  getCustomerByName(name) {
    const data = this.readDataFile();
    const customers = data.customers || [];
    const customer = customers.find(c => c.name === name);

    if (!customer) {
      return null;
    }

    // 确保状态字段存在
    const status = customer.status || customerStatusManager.STATUS.NOT_PACKED;
    const shipmentStatus = customer.shipmentStatus || customerStatusManager.SHIPMENT_STATUS.NOT_SHIPPED;

    // 返回客户数据副本
    return {
      ...customer,
      status,
      shipmentStatus,
      packedParts: customer.packedParts || 0,
      totalParts: customer.totalParts || 0,
      packProgress: customer.packProgress || 0,
      packSeqs: customer.packSeqs || [],
      lastPackUpdate: customer.lastPackUpdate || new Date().toISOString(),
      lastShipmentUpdate: customer.lastShipmentUpdate || new Date().toISOString()
    };
  }

  /**
   * 获取所有客户
   * @returns {Array} - 客户数据数组
   */
  getAllCustomers() {
    const data = this.readDataFile();
    const customers = data.customers || [];

    // 为每个客户确保状态字段存在
    return customers.map(customer => {
      const status = customer.status || customerStatusManager.STATUS.NOT_PACKED;
      const shipmentStatus = customer.shipmentStatus || customerStatusManager.SHIPMENT_STATUS.NOT_SHIPPED;

      return {
        ...customer,
        status,
        shipmentStatus,
        packedParts: customer.packedParts || 0,
        totalParts: customer.totalParts || 0,
        packProgress: customer.packProgress || 0,
        packSeqs: customer.packSeqs || [],
        lastPackUpdate: customer.lastPackUpdate || new Date().toISOString(),
        lastShipmentUpdate: customer.lastShipmentUpdate || new Date().toISOString()
      };
    });
  }

  /**
   * 更新客户状态
   * @param {string} customerId - 客户ID
   * @param {Object} statusInfo - 状态信息
   * @param {string} operator - 操作人员
   * @param {string} remark - 备注
   * @returns {Object} - 更新后的客户数据
   */
  updateCustomerStatus(customerId, statusInfo, operator = '系统', remark = '') {
    // 读取数据
    const data = this.readDataFile();
    const customers = data.customers || [];

    // 查找客户
    const customerIndex = customers.findIndex(c => c.id === customerId);
    if (customerIndex === -1) {
      throw new Error('客户不存在');
    }

    const customer = customers[customerIndex];

    // 确保状态历史存在
    if (!customer.statusHistory) {
      customer.statusHistory = [];
    }

    // 添加初始状态记录（如果这是第一次状态更新）
    if (customer.statusHistory.length === 0) {
      customer.statusHistory.push({
        status: customerStatusManager.STATUS.NOT_PACKED,
        shipmentStatus: customerStatusManager.SHIPMENT_STATUS.NOT_SHIPPED,
        timestamp: new Date().toISOString(),
        operator: '系统',
        remark: '初始状态'
      });
    }

    // 获取当前状态
    const currentStatus = customer.status || customerStatusManager.STATUS.NOT_PACKED;
    const currentShipmentStatus = customer.shipmentStatus || customerStatusManager.SHIPMENT_STATUS.NOT_SHIPPED;

    // 更新状态字段
    if (statusInfo.status) {
      customer.status = statusInfo.status;
      customer.lastPackUpdate = new Date().toISOString();
    }

    if (statusInfo.shipmentStatus) {
      customer.shipmentStatus = statusInfo.shipmentStatus;
      customer.lastShipmentUpdate = new Date().toISOString();
    }

    // 更新打包进度相关字段
    customer.packedParts = statusInfo.packedParts || 0;
    customer.totalParts = statusInfo.totalParts || 0;
    customer.packSeqs = statusInfo.packSeqs || [];
    customer.packProgress = statusInfo.packProgress || 0;

    // 如果是第一次打包，记录打包时间
    if (statusInfo.status === customerStatusManager.STATUS.PACKED && !customer.packDate) {
      customer.packDate = new Date().toISOString();
    }

    // 如果是归档，记录归档时间
    if (statusInfo.status === customerStatusManager.STATUS.ARCHIVED && !customer.archiveDate) {
      customer.archiveDate = new Date().toISOString();
    }

    // 如果是出货，记录出货时间
    if ((statusInfo.shipmentStatus === customerStatusManager.SHIPMENT_STATUS.FULL_SHIPPED ||
      statusInfo.shipmentStatus === customerStatusManager.SHIPMENT_STATUS.PARTIAL_SHIPPED) &&
      !customer.shipmentDate) {
      customer.shipmentDate = new Date().toISOString();
    }

    // 更新时间戳
    customer.updatedAt = new Date().toISOString();

    // 添加到状态历史
    const statusChangeRecord = {
      status: statusInfo.status || currentStatus,
      shipmentStatus: statusInfo.shipmentStatus || currentShipmentStatus,
      previousStatus: currentStatus,
      previousShipmentStatus: currentShipmentStatus,
      timestamp: new Date().toISOString(),
      operator,
      remark: remark || `状态变更为 ${statusInfo.status || currentStatus}`,
      packProgress: statusInfo.packProgress || 0,
      packedParts: statusInfo.packedParts || 0,
      totalParts: statusInfo.totalParts || 0
    };

    customer.statusHistory.push(statusChangeRecord);

    // 保存数据
    customers[customerIndex] = customer;
    this.writeDataFile({
      ...data,
      customers
    });

    return customer;
  }

  /**
   * 删除客户
   * @param {string} customerId - 客户ID
   * @returns {boolean} - 是否删除成功
   */
  deleteCustomer(customerId) {
    // 读取数据
    const data = this.readDataFile();
    const customers = data.customers || [];
    const allPanels = this.readPanelsData();

    // 查找客户
    const customerIndex = customers.findIndex(c => c.id === customerId);
    if (customerIndex === -1) {
      throw new Error('客户不存在');
    }

    const customer = customers[customerIndex];

    // 删除客户
    customers.splice(customerIndex, 1);

    // 删除相关面板
    const updatedPanels = allPanels.filter(panel => panel.customerId !== customerId);

    // 保存数据
    this.writeDataFile({
      ...data,
      customers
    });
    this.writePanelsData(updatedPanels);

    return true;
  }

  /**
   * 获取客户状态历史
   * @param {string} customerId - 客户ID
   * @returns {Array} - 状态历史数组
   */
  getCustomerStatusHistory(customerId) {
    const customer = this.getCustomerById(customerId);
    if (!customer) {
      throw new Error('客户不存在');
    }

    return customer.statusHistory || [];
  }

  /**
   * 添加客户备注
   * @param {string} customerId - 客户ID
   * @param {string} note - 备注内容
   * @param {string} operator - 操作人员
   * @returns {Object} - 更新后的客户数据
   */
  addCustomerNote(customerId, note, operator = '系统') {
    const customer = this.getCustomerById(customerId);
    if (!customer) {
      throw new Error('客户不存在');
    }

    // 确保备注数组存在
    if (!customer.notes) {
      customer.notes = [];
    }

    // 添加备注
    const noteRecord = {
      id: crypto.randomUUID(),
      content: note,
      timestamp: new Date().toISOString(),
      operator
    };

    customer.notes.push(noteRecord);
    customer.updatedAt = new Date().toISOString();

    // 更新客户数据
    return this.createOrUpdateCustomer(customer, operator);
  }

  /**
   * 获取客户统计信息
   * @returns {Object} - 统计信息
   */
  getCustomerStatistics() {
    const customers = this.getAllCustomers();
    const statistics = {
      total: customers.length,
      notPacked: 0,
      inProgress: 0,
      packed: 0,
      archived: 0,
      notShipped: 0,
      partialShipped: 0,
      fullShipped: 0,
      totalPanels: 0,
      packedPanels: 0
    };

    customers.forEach(customer => {
      // 统计打包状态
      switch (customer.status) {
        case customerStatusManager.STATUS.NOT_PACKED:
          statistics.notPacked++;
          break;
        case customerStatusManager.STATUS.IN_PROGRESS:
          statistics.inProgress++;
          break;
        case customerStatusManager.STATUS.PACKED:
          statistics.packed++;
          break;
        case customerStatusManager.STATUS.ARCHIVED:
          statistics.archived++;
          break;
      }

      // 统计出货状态
      switch (customer.shipmentStatus) {
        case customerStatusManager.SHIPMENT_STATUS.NOT_SHIPPED:
          statistics.notShipped++;
          break;
        case customerStatusManager.SHIPMENT_STATUS.PARTIAL_SHIPPED:
          statistics.partialShipped++;
          break;
        case customerStatusManager.SHIPMENT_STATUS.FULL_SHIPPED:
          statistics.fullShipped++;
          break;
      }

      // 统计面板数量
      statistics.totalPanels += customer.totalParts || 0;
      statistics.packedPanels += customer.packedParts || 0;
    });

    return statistics;
  }
}

// 创建全局实例
const customerFS = new CustomerFS();

// 同时导出类和实例
module.exports = {
  CustomerFS: CustomerFS,
  customerFS: customerFS,
  // 为了向后兼容，默认导出实例
  default: customerFS
};