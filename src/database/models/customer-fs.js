/**
 * 客户数据模型 - 文件系统版本
 */

const fs = require('fs');
const path = require('path');
const { CustomerStatus } = require('../../utils/status-manager');

// 默认数据文件路径
let dataDir = path.join(__dirname, '../../data');
let customerDataPath = path.join(dataDir, 'database.json');
let panelDataPath = path.join(dataDir, 'panels.json');
let historyDataPath = path.join(dataDir, 'history.json');

/**
 * 设置数据路径
 * @param {string} newDataDir - 新的数据目录路径
 */
function setDataPath(newDataDir) {
  dataDir = newDataDir;
  customerDataPath = path.join(dataDir, 'database.json');
  panelDataPath = path.join(dataDir, 'panels.json');
  historyDataPath = path.join(dataDir, 'history.json');

  // 确保数据目录存在
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  // 初始化数据文件
  if (!fs.existsSync(customerDataPath)) {
    fs.writeFileSync(customerDataPath, JSON.stringify([]));
  }
  if (!fs.existsSync(panelDataPath)) {
    fs.writeFileSync(panelDataPath, JSON.stringify([]));
  }
  if (!fs.existsSync(historyDataPath)) {
    fs.writeFileSync(historyDataPath, JSON.stringify([]));
  }

  console.log(`数据路径已设置为: ${dataDir}`);
}

// 确保数据目录存在
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// 初始化数据文件
if (!fs.existsSync(customerDataPath)) {
  fs.writeFileSync(customerDataPath, JSON.stringify([]));
}
if (!fs.existsSync(panelDataPath)) {
  fs.writeFileSync(panelDataPath, JSON.stringify([]));
}
if (!fs.existsSync(historyDataPath)) {
  fs.writeFileSync(historyDataPath, JSON.stringify([]));
}

/**
 * 创建或更新客户数据
 * @param {Object} customerData - 客户数据
 * @returns {Promise<Object>} 创建或更新的客户数据
 */
async function createOrUpdateCustomer(customerData) {
  return new Promise((resolve, reject) => {
    try {
      const {
        name,
        status = CustomerStatus.UNPACKED,
        packProgress = 0,
        packedCount = 0,
        totalParts = 0,
        packSeqs = [],
        lastUpdate = new Date().toISOString(),
        packDate = null,
        archiveDate = null,
        shipmentDate = null,
        statusHistory = [],
        panels = [],
        outputPath = null
      } = customerData;

      // 读取现有数据
      const database = JSON.parse(fs.readFileSync(customerDataPath, 'utf8'));
      const customers = database.customers || [];
      const panelsData = JSON.parse(fs.readFileSync(panelDataPath, 'utf8'));
      const historyData = JSON.parse(fs.readFileSync(historyDataPath, 'utf8'));

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
        customer.statusHistory = statusHistory;
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
        const databaseToSave = {
          customers: customers,
          settings: database.settings || {},
          history: database.history || []
        };
        fs.writeFileSync(customerDataPath, JSON.stringify(databaseToSave, null, 2));
        fs.writeFileSync(panelDataPath, JSON.stringify(panelsData, null, 2));
        fs.writeFileSync(historyDataPath, JSON.stringify(historyData, null, 2));

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
          statusHistory,
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
              timestamp: history.timestamp || now,
              operator: history.operator,
              remark: history.remark
            });
          });
        }

        // 添加面板数据
        if (panels && Array.isArray(panels)) {
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
        const databaseToSave = {
          customers: customers,
          settings: database.settings || {},
          history: database.history || []
        };
        fs.writeFileSync(customerDataPath, JSON.stringify(databaseToSave, null, 2));
        fs.writeFileSync(panelDataPath, JSON.stringify(panelsData, null, 2));
        fs.writeFileSync(historyDataPath, JSON.stringify(historyData, null, 2));

        // 返回新创建的客户数据
        getCustomerById(newCustomer.id).then(resolve).catch(reject);
      }
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * 根据客户ID获取客户数据
 * @param {number} id - 客户ID
 * @returns {Promise<Object>} 客户数据
 */
function getCustomerById(id) {
  return new Promise((resolve, reject) => {
    try {
      const database = JSON.parse(fs.readFileSync(customerDataPath, 'utf8'));
      const customers = database.customers || [];
      const panelsData = JSON.parse(fs.readFileSync(panelDataPath, 'utf8'));
      const historyData = JSON.parse(fs.readFileSync(historyDataPath, 'utf8'));

      const customer = customers.find(c => c.id === id);
      if (!customer) {
        resolve(null);
        return;
      }

      // 获取面板数据
      const panels = panelsData.filter(p => p.customerId === id).map(p => ({
        id: p.panelId,
        name: p.name,
        width: p.width,
        height: p.height,
        thickness: p.thickness,
        material: p.material,
        edgeBand: p.edgeBand,
        edgeBandWidth: p.edgeBandWidth,
        edgeBandColor: p.edgeBandColor,
        isPacked: p.isPacked === 1
      }));

      // 获取状态历史
      const history = historyData.filter(h => h.customerId === id).map(h => ({
        status: h.status,
        timestamp: h.timestamp,
        operator: h.operator,
        remark: h.remark
      }));

      resolve({
        id: customer.id,
        name: customer.name,
        status: customer.status,
        packProgress: customer.packProgress,
        packedCount: customer.packedCount,
        totalParts: customer.totalParts,
        packSeqs: customer.packSeqs || [],
        lastUpdate: customer.lastUpdate,
        packDate: customer.packDate,
        archiveDate: customer.archiveDate,
        shipmentDate: customer.shipmentDate,
        statusHistory: (customer.statusHistory || []).concat(history),
        outputPath: customer.outputPath, // 添加outputPath字段
        panels
      });
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * 根据客户名称获取客户数据
 * @param {string} name - 客户名称
 * @returns {Promise<Object>} 客户数据
 */
async function getCustomerByName(name) {
  return new Promise((resolve, reject) => {
    try {
      // 确保数据文件存在
      if (!fs.existsSync(customerDataPath)) {
        console.warn(`客户数据文件不存在: ${customerDataPath}`);
        resolve(null);
        return;
      }

      const database = JSON.parse(fs.readFileSync(customerDataPath, 'utf8'));
      const customers = database.customers || [];
      console.log(`从文件中读取到 ${customers.length} 个客户`);
      const customer = customers.find(c => c.name === name);

      if (!customer) {
        console.warn(`未找到名称为 "${name}" 的客户`);
        console.log(`可用的客户列表:`, customers.map(c => c.name));
        resolve(null);
        return;
      }

      getCustomerById(customer.id).then(resolve).catch(reject);
    } catch (err) {
      console.error('获取客户数据时出错:', err);
      reject(err);
    }
  });
}

/**
 * 获取所有客户数据
 * @returns {Promise<Array>} 客户数据列表
 */
async function getAllCustomers() {
  return new Promise((resolve, reject) => {
    try {
      const database = JSON.parse(fs.readFileSync(customerDataPath, 'utf8'));
      const customers = database.customers || [];
      const customerPromises = customers.map(c => getCustomerById(c.id));
      Promise.all(customerPromises)
        .then(customers => resolve(customers))
        .catch(reject);
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * 更新客户状态
 * @param {Object} customer - 客户数据
 * @param {string} status - 新状态
 * @param {string} operator - 操作人员
 * @param {string} remark - 备注
 * @returns {Promise<Object>} 更新后的客户数据
 */
async function updateCustomerStatus(customer, status, operator = '系统', remark = '') {
  return new Promise((resolve, reject) => {
    try {
      const {
        id,
        name,
        currentStatus = customer.status,
        packProgress = customer.packProgress,
        packedCount = customer.packedCount,
        totalParts = customer.totalParts,
        packSeqs = customer.packSeqs,
        lastUpdate = customer.lastUpdate,
        packDate = customer.packDate,
        archiveDate = customer.archiveDate,
        shipmentDate = customer.shipmentDate,
        statusHistory = customer.statusHistory || []
      } = customer;

      // 读取现有数据
      const database = JSON.parse(fs.readFileSync(customerDataPath, 'utf8'));
      const customers = database.customers || [];
      const historyData = JSON.parse(fs.readFileSync(historyDataPath, 'utf8'));
      const now = new Date().toISOString();

      // 获取当前状态历史
      const currentStatusHistory = statusHistory || [];

      // 创建新的状态记录
      const newStatusHistory = [
        ...currentStatusHistory,
        {
          status: currentStatus,
          timestamp: lastUpdate,
          operator: operator,
          remark: remark
        }
      ];

      // 根据状态更新特定字段
      let newPackDate = packDate;
      let newArchiveDate = archiveDate;
      let newShipmentDate = shipmentDate;

      switch (status) {
        case CustomerStatus.PACKED:
          newPackDate = now;
          break;
        case CustomerStatus.ARCHIVED:
          newArchiveDate = now;
          break;
        case CustomerStatus.SHIPPED:
          newShipmentDate = now;
          break;
      }

      // 更新客户状态
      const customerIndex = customers.findIndex(c => c.id === id);
      if (customerIndex >= 0) {
        const customer = customers[customerIndex];
        customer.status = status;
        customer.packProgress = packProgress;
        customer.packedCount = packedCount;
        customer.totalParts = totalParts;
        customer.packSeqs = packSeqs;
        customer.lastUpdate = lastUpdate;
        customer.packDate = newPackDate;
        customer.archiveDate = newArchiveDate;
        customer.shipmentDate = newShipmentDate;
        customer.statusHistory = newStatusHistory;
        customer.updatedAt = now;

        // 添加状态历史记录
        historyData.push({
          customerId: id,
          status: status,
          operator: operator,
          remark: remark,
          timestamp: lastUpdate,
          createdAt: now
        });

        // 保存数据
        const databaseToSave = {
          customers: customers,
          settings: database.settings || {},
          history: database.history || []
        };
        fs.writeFileSync(customerDataPath, JSON.stringify(databaseToSave, null, 2));
        fs.writeFileSync(historyDataPath, JSON.stringify(historyData, null, 2));

        // 返回更新后的客户数据
        getCustomerById(id).then(resolve).catch(reject);
      } else {
        reject(new Error('客户不存在'));
      }
    } catch (err) {
      reject(err);
    }
  });
}

module.exports = {
  createOrUpdateCustomer,
  getCustomerById,
  getCustomerByName,
  getAllCustomers,
  updateCustomerStatus,
  setDataPath
};