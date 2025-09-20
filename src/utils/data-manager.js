/**
 * 数据管理器
 * 用于管理客户数据的增删改查操作
 */

const fs = require('fs');
const path = require('path');

// 数据文件路径
const dataDir = path.join(__dirname, '../data');
const customerDataPath = path.join(dataDir, 'customers.json');
const panelDataPath = path.join(dataDir, 'panels.json');
const historyDataPath = path.join(dataDir, 'history.json');

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
 * 检查数据库连接状态
 * @returns {Promise<Object>} 连接状态信息
 */
async function checkConnection() {
  try {
    // 检查数据文件是否存在且可读
    const customerExists = fs.existsSync(customerDataPath);
    const panelExists = fs.existsSync(panelDataPath);
    const historyExists = fs.existsSync(historyDataPath);
    
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
        statusHistory = [],
        replacementStatus = 'none',
        replacementHistory = [],
        panels = [],
        outputPath = null
      } = customerData;

      // 读取现有数据
      const customers = JSON.parse(fs.readFileSync(customerDataPath, 'utf8'));
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
        fs.writeFileSync(customerDataPath, JSON.stringify(customers, null, 2));
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
        fs.writeFileSync(customerDataPath, JSON.stringify(customers, null, 2));
        fs.writeFileSync(panelDataPath, JSON.stringify(panelsData, null, 2));
        fs.writeFileSync(historyDataPath, JSON.stringify(historyData, null, 2));

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
      const customers = JSON.parse(fs.readFileSync(customerDataPath, 'utf8'));
      const panelsData = JSON.parse(fs.readFileSync(panelDataPath, 'utf8'));
      
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
      const customers = JSON.parse(fs.readFileSync(customerDataPath, 'utf8'));
      const panelsData = JSON.parse(fs.readFileSync(panelDataPath, 'utf8'));
      
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
      const customers = JSON.parse(fs.readFileSync(customerDataPath, 'utf8'));
      const panelsData = JSON.parse(fs.readFileSync(panelDataPath, 'utf8'));
      
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
      const customers = JSON.parse(fs.readFileSync(customerDataPath, 'utf8'));
      const panelsData = JSON.parse(fs.readFileSync(panelDataPath, 'utf8'));
      const initialLength = customers.length;
      
      // 过滤掉要删除的客户
      const filteredCustomers = customers.filter(c => c.id != id);
      
      // 删除相关的面板数据
      const filteredPanels = panelsData.filter(p => p.customerId != id);
      
      // 保存数据
      fs.writeFileSync(customerDataPath, JSON.stringify(filteredCustomers, null, 2));
      fs.writeFileSync(panelDataPath, JSON.stringify(filteredPanels, null, 2));
      
      resolve(filteredCustomers.length < initialLength);
    } catch (error) {
      reject(error);
    }
  });
}

module.exports = {
  upsertCustomer,
  getCustomerById,
  getCustomer,
  getAllCustomers,
  deleteCustomer,
  checkConnection
};