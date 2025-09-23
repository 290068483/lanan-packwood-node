/**
 * 数据管理器
 * 用于管理客户数据的增删改查操作
 */

const fs = require('fs');
const path = require('path');
const connection = require('../database/connection');

// 动态获取数据路径
const getDataDir = () => {
  const currentDbPath = connection.getCurrentDbPath();
  if (!currentDbPath) {
    throw new Error('数据库未初始化，请先调用switchDatabase');
  }
  return currentDbPath;
};

// 数据文件路径
const getCustomerDataPath = () => path.join(getDataDir(), 'customers.json');
const getPanelDataPath = () => path.join(getDataDir(), 'panels.json');
const getHistoryDataPath = () => path.join(getDataDir(), 'history.json');
const getDatabasePath = () => path.join(getDataDir(), 'database.json');

/**
 * 检查数据库连接状态
 * @returns {Promise<Object>} 连接状态信息
 */
async function checkConnection() {
  try {
    // 检查数据文件是否存在且可读
    const customerExists = fs.existsSync(getCustomerDataPath());
    const panelExists = fs.existsSync(getPanelDataPath());
    const historyExists = fs.existsSync(getHistoryDataPath());

    if (customerExists && panelExists && historyExists) {
      return {
        connected: true,
        status: 'connected',
        message: '文件系统数据库连接正常'
      };
    } else {
      return {
        connected: false,
        status: 'disconnected',
        message: '文件系统数据库连接异常'
      };
    }
  } catch (error) {
    return {
      connected: false,
      status: 'error',
      message: `数据库连接检查失败: ${error.message}`
    };
  }
}

/**
 * 创建或更新客户数据
 * @param {Object} customerData - 客户数据
 * @returns {Promise<Object>} 创建或更新的客户数据
 */
async function upsertCustomer(customerData) {
  return new Promise((resolve, reject) => {
    try {
      const {
        name,
        status,
        packProgress = 0,
        packedCount = 0,
        totalParts = 0,
        packSeqs = [],
        lastUpdate = new Date().toISOString(),
        packDate = null,
        archiveDate = null,
        shipmentDate = null,
        shipmentStatus = null,
        shipmentRemark = null,
        shipmentInfo = null,
        statusHistory = [],
        replacementStatus = 'none',
        replacementHistory = [],
        panels = [],
        outputPath = null
      } = customerData;

      // 读取现有数据
      const customers = JSON.parse(fs.readFileSync(getCustomerDataPath(), 'utf8'));
      const panelsData = JSON.parse(fs.readFileSync(getPanelDataPath(), 'utf8'));
      const historyData = JSON.parse(fs.readFileSync(getHistoryDataPath(), 'utf8'));

      // 查找现有客户
      const existingCustomerIndex = customers.findIndex(c => c.name === name);
      const now = new Date().toISOString();

      if (existingCustomerIndex >= 0) {
        // 更新现有客户
        const customer = customers[existingCustomerIndex];
        customer.status = status;
        customer.packProgress = packProgress;
        customer.packedCount = packedCount;
        customer.totalParts = totalParts;
        customer.packSeqs = packSeqs;
        customer.lastUpdate = lastUpdate;
        customer.packDate = packDate;
        customer.archiveDate = archiveDate;
        customer.shipmentDate = shipmentDate;
        customer.shipmentStatus = shipmentStatus;
        customer.shipmentRemark = shipmentRemark;
        customer.shipmentInfo = shipmentInfo;
        customer.statusHistory = statusHistory;
        customer.replacementStatus = replacementStatus;
        customer.replacementHistory = replacementHistory;
        customer.outputPath = outputPath;
        customer.updatedAt = now;

        // 更新状态历史
        if (statusHistory.length > 0) {
          statusHistory.forEach(history => {
            historyData.push({
              customerId: customer.id,
              status: history.status,
              operator: history.operator,
              remark: history.remark,
              timestamp: history.timestamp,
              createdAt: now
            });
          });
        }

        // 更新面板数据
        if (panels && panels.length > 0) {
          // 删除现有面板数据
          const filteredPanels = panelsData.filter(p => p.customerId !== customer.id);
          panelsData.length = 0;
          panelsData.push(...filteredPanels);

          // 添加新面板数据
          panels.forEach(panel => {
            panelsData.push({
              customerId: customer.id,
              panelId: panel.id,
              name: panel.name,
              width: panel.width,
              height: panel.height,
              thickness: panel.thickness,
              material: panel.material,
              edgeBand: panel.edgeBand,
              edgeBandWidth: panel.edgeBandWidth,
              edgeBandColor: panel.edgeBandColor,
              isPacked: panel.isPacked ? 1 : 0,
              createdAt: new Date().toISOString()
            });
          });
        }

        // 保存数据
        fs.writeFileSync(getCustomerDataPath(), JSON.stringify(customers, null, 2));
        fs.writeFileSync(getPanelDataPath(), JSON.stringify(panelsData, null, 2));
        fs.writeFileSync(getHistoryDataPath(), JSON.stringify(historyData, null, 2));

        // 返回更新后的客户数据
        getCustomerById(customer.id).then(resolve).catch(reject);
      } else {
        // 创建新客户
        const newCustomer = {
          id: customers.length > 0 ? Math.max(...customers.map(c => c.id)) + 1 : 1,
          name,
          status,
          packProgress,
          packedCount,
          totalParts,
          packSeqs,
          lastUpdate,
          packDate,
          archiveDate,
          shipmentDate,
          shipmentStatus,
          shipmentRemark,
          shipmentInfo,
          statusHistory,
          replacementStatus,
          replacementHistory,
          outputPath, // 添加outputPath字段
          createdAt: now,
          updatedAt: now
        };

        customers.push(newCustomer);

        // 添加状态历史
        if (statusHistory.length > 0) {
          statusHistory.forEach(history => {
            historyData.push({
              customerId: newCustomer.id,
              status: history.status,
              operator: history.operator,
              remark: history.remark,
              timestamp: history.timestamp,
              createdAt: now
            });
          });
        }

        // 添加面板数据
        if (panels && panels.length > 0) {
          panels.forEach(panel => {
            panelsData.push({
              customerId: newCustomer.id,
              panelId: panel.id,
              name: panel.name,
              width: panel.width,
              height: panel.height,
              thickness: panel.thickness,
              material: panel.material,
              edgeBand: panel.edgeBand,
              edgeBandWidth: panel.edgeBandWidth,
              edgeBandColor: panel.edgeBandColor,
              isPacked: panel.isPacked ? 1 : 0,
              createdAt: new Date().toISOString()
            });
          });
        }

        // 保存数据
        fs.writeFileSync(getCustomerDataPath(), JSON.stringify(customers, null, 2));
        fs.writeFileSync(getPanelDataPath(), JSON.stringify(panelsData, null, 2));
        fs.writeFileSync(getHistoryDataPath(), JSON.stringify(historyData, null, 2));

        resolve(newCustomer);
      }
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * 根据ID获取客户数据
 * @param {string|number} id - 客户ID
 * @returns {Promise<Object|null>} 客户数据或null
 */
async function getCustomerById(id) {
  return new Promise((resolve, reject) => {
    try {
      const customers = JSON.parse(fs.readFileSync(getCustomerDataPath(), 'utf8'));
      const panelsData = JSON.parse(fs.readFileSync(getPanelDataPath(), 'utf8'));

      const customer = customers.find(c => c.id == id);
      if (!customer) {
        resolve(null);
        return;
      }

      // 获取客户的面板数据
      const customerPanels = panelsData.filter(p => p.customerId == id);
      customer.panels = customerPanels.map(panel => ({
        id: panel.panelId,
        name: panel.name,
        width: panel.width,
        height: panel.height,
        thickness: panel.thickness,
        material: panel.material,
        edgeBand: panel.edgeBand,
        edgeBandWidth: panel.edgeBandWidth,
        edgeBandColor: panel.edgeBandColor,
        isPacked: panel.isPacked === 1
      }));

      resolve(customer);
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * 根据名称获取客户数据
 * @param {string} name - 客户名称
 * @returns {Promise<Object|null>} 客户数据或null
 */
async function getCustomer(name) {
  return new Promise((resolve, reject) => {
    try {
      const customers = JSON.parse(fs.readFileSync(getCustomerDataPath(), 'utf8'));
      const panelsData = JSON.parse(fs.readFileSync(getPanelDataPath(), 'utf8'));

      const customer = customers.find(c => c.name === name);
      if (!customer) {
        resolve(null);
        return;
      }

      // 获取客户的面板数据
      const customerPanels = panelsData.filter(p => p.customerId == customer.id);
      customer.panels = customerPanels.map(panel => ({
        id: panel.panelId,
        name: panel.name,
        width: panel.width,
        height: panel.height,
        thickness: panel.thickness,
        material: panel.material,
        edgeBand: panel.edgeBand,
        edgeBandWidth: panel.edgeBandWidth,
        edgeBandColor: panel.edgeBandColor,
        isPacked: panel.isPacked === 1
      }));

      resolve(customer);
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * 获取所有客户数据
 * @returns {Promise<Array>} 所有客户数据
 */
async function getAllCustomers() {
  return new Promise((resolve, reject) => {
    try {
      const customers = JSON.parse(fs.readFileSync(getCustomerDataPath(), 'utf8'));
      const panelsData = JSON.parse(fs.readFileSync(getPanelDataPath(), 'utf8'));

      // 为每个客户添加面板数据
      const customersWithPanels = customers.map(customer => {
        const customerPanels = panelsData.filter(p => p.customerId == customer.id);
        return {
          ...customer,
          panels: customerPanels.map(panel => ({
            id: panel.panelId,
            name: panel.name,
            width: panel.width,
            height: panel.height,
            thickness: panel.thickness,
            material: panel.material,
            edgeBand: panel.edgeBand,
            edgeBandWidth: panel.edgeBandWidth,
            edgeBandColor: panel.edgeBandColor,
            isPacked: panel.isPacked === 1
          }))
        };
      });

      resolve(customersWithPanels);
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * 删除客户数据
 * @param {string|number} id - 客户ID
 * @returns {Promise<boolean>} 是否删除成功
 */
async function deleteCustomer(id) {
  return new Promise((resolve, reject) => {
    try {
      const customers = JSON.parse(fs.readFileSync(getCustomerDataPath(), 'utf8'));
      const panelsData = JSON.parse(fs.readFileSync(getPanelDataPath(), 'utf8'));
      const initialLength = customers.length;

      // 过滤掉要删除的客户
      const filteredCustomers = customers.filter(c => c.id != id);

      // 删除相关的面板数据
      const filteredPanels = panelsData.filter(p => p.customerId != id);

      // 保存数据
      fs.writeFileSync(getCustomerDataPath(), JSON.stringify(filteredCustomers, null, 2));
      fs.writeFileSync(getPanelDataPath(), JSON.stringify(filteredPanels, null, 2));

      resolve(filteredCustomers.length < initialLength);
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * 更新客户状态
 * @param {string} customerName - 客户名称
 * @param {string} status - 新状态
 * @param {string} remark - 备注
 * @returns {Promise<boolean>} 是否更新成功
 */
async function updateCustomerStatus(customerName, status, remark) {
  return new Promise((resolve, reject) => {
    try {
      const customers = JSON.parse(fs.readFileSync(getCustomerDataPath(), 'utf8'));
      const customer = customers.find(c => c.name === customerName);

      if (!customer) {
        resolve(false);
        return;
      }

      // 更新客户状态
      customer.status = status;
      customer.updatedAt = new Date().toISOString();

      // 添加状态历史记录
      const historyData = JSON.parse(fs.existsSync(getHistoryDataPath()) ?
        fs.readFileSync(getHistoryDataPath(), 'utf8') : '[]');

      historyData.push({
        customerId: customer.id,
        status: status,
        operator: 'system',
        remark: remark || '',
        timestamp: new Date().toISOString(),
        createdAt: new Date().toISOString()
      });

      // 保存数据
      fs.writeFileSync(getCustomerDataPath(), JSON.stringify(customers, null, 2));
      fs.writeFileSync(getHistoryDataPath(), JSON.stringify(historyData, null, 2));

      resolve(true);
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * 更新客户出货状态
 * @param {string} customerName - 客户名称
 * @param {Object} shippingInfo - 出货信息
 * @returns {Promise<boolean>} 是否更新成功
 */
async function updateCustomerShipment(customerName, shippingInfo) {
  return new Promise((resolve, reject) => {
    try {
      const customers = JSON.parse(fs.readFileSync(getCustomerDataPath(), 'utf8'));
      const customer = customers.find(c => c.name === customerName);

      if (!customer) {
        resolve(false);
        return;
      }

      // 更新出货相关字段，不改变客户状态
      customer.shipmentDate = new Date().toISOString();
      customer.shipmentStatus = 'shipped';
      customer.shipmentRemark = shippingInfo?.remark || '已发货';
      customer.shipmentInfo = shippingInfo || {};
      customer.updatedAt = new Date().toISOString();

      // 添加出货历史记录
      const historyData = JSON.parse(fs.existsSync(getHistoryDataPath()) ?
        fs.readFileSync(getHistoryDataPath(), 'utf8') : '[]');

      historyData.push({
        customerId: customer.id,
        status: 'shipped',
        operator: 'system',
        remark: shippingInfo?.remark || '已发货',
        timestamp: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        type: 'shipment'
      });

      // 保存数据
      fs.writeFileSync(getCustomerDataPath(), JSON.stringify(customers, null, 2));
      fs.writeFileSync(getHistoryDataPath(), JSON.stringify(historyData, null, 2));

      resolve(true);
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * 获取设置
 * @returns {Object} 设置对象
 */
function getSettings() {
  try {
    const settingsPath = path.join(getDataDir(), 'settings.json');
    if (fs.existsSync(settingsPath)) {
      return JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
    }
    return {};
  } catch (error) {
    console.error('获取设置失败:', error);
    return {};
  }
}

/**
 * 保存设置
 * @param {Object} settings - 设置对象
 * @returns {boolean} 是否保存成功
 */
function saveSettings(settings) {
  try {
    const settingsPath = path.join(getDataDir(), 'settings.json');
    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
    return true;
  } catch (error) {
    console.error('保存设置失败:', error);
    return false;
  }
}

/**
 * 获取历史记录
 * @param {number} limit - 限制数量
 * @returns {Array} 历史记录数组
 */
function getHistoryRecords(limit = 10) {
  try {
    const historyData = JSON.parse(fs.existsSync(getHistoryDataPath()) ?
      fs.readFileSync(getHistoryDataPath(), 'utf8') : '[]');

    // 按时间戳倒序排列并限制数量
    return historyData
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, limit)
      .map(record => ({
        action: record.status || record.type || '未知操作',
        customerName: record.customerId ? `客户${record.customerId}` : '系统',
        timestamp: record.timestamp || record.createdAt,
        remark: record.remark || ''
      }));
  } catch (error) {
    console.error('获取历史记录失败:', error);
    return [];
  }
}

module.exports = {
  upsertCustomer,
  getCustomerById,
  getCustomer,
  getAllCustomers,
  deleteCustomer,
  checkConnection,
  updateCustomerStatus,
  updateCustomerShipment,
  getSettings,
  saveSettings,
  getHistoryRecords
};