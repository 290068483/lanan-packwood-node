/**
 * 数据库API接口
 * 提供与数据库交互的API接口
 */

const { createOrUpdateCustomer, getCustomerById, getCustomerByName, getAllCustomers, updateCustomerStatus, getCustomersByStatus } = require('./models/customer');

/**
 * 获取所有客户数据
 * @returns {Promise<Array>} 客户数据列表
 */
async function getAllCustomersAPI() {
  try {
    const customers = await getAllCustomers();
    return customers.map(customer => ({
      id: customer.id,
      name: customer.name,
      status: customer.status,
      packProgress: customer.packProgress,
      packedCount: customer.packedCount,
      totalParts: customer.totalParts,
      packSeqs: customer.packSeqs,
      lastUpdate: customer.lastUpdate,
      packDate: customer.packDate,
      archiveDate: customer.archiveDate,
      shipmentDate: customer.shipmentDate
    }));
  } catch (error) {
    console.error('获取所有客户数据出错:', error);
    throw error;
  }
}

/**
 * 获取客户数据
 * @param {string} name - 客户名称
 * @returns {Promise<Object>} 客户数据
 */
async function getCustomerAPI(name) {
  try {
    const customer = await getCustomerByName(name);
    if (!customer) {
      throw new Error('客户不存在');
    }

    return {
      id: customer.id,
      name: customer.name,
      status: customer.status,
      packProgress: customer.packProgress,
      packedCount: customer.packedCount,
      totalParts: customer.totalParts,
      packSeqs: customer.packSeqs,
      lastUpdate: customer.lastUpdate,
      packDate: customer.packDate,
      archiveDate: customer.archiveDate,
      shipmentDate: customer.shipmentDate,
      statusHistory: customer.statusHistory,
      panels: customer.panels
    };
  } catch (error) {
    console.error('获取客户数据出错:', error);
    throw error;
  }
}

/**
 * 更新客户状态
 * @param {string} name - 客户名称
 * @param {string} status - 新状态
 * @param {string} operator - 操作人员
 * @param {string} remark - 备注
 * @returns {Promise<Object>} 更新后的客户数据
 */
async function updateCustomerStatusAPI(name, status, operator = '系统', remark = '') {
  try {
    // 先获取客户数据
    const customer = await getCustomerByName(name);
    if (!customer) {
      throw new Error('客户不存在');
    }

    // 更新客户状态
    const updatedCustomer = await updateCustomerStatus(customer, status, operator, remark);

    return {
      id: updatedCustomer.id,
      name: updatedCustomer.name,
      status: updatedCustomer.status,
      packProgress: updatedCustomer.packProgress,
      packedCount: updatedCustomer.packedCount,
      totalParts: updatedCustomer.totalParts,
      packSeqs: updatedCustomer.packSeqs,
      lastUpdate: updatedCustomer.lastUpdate,
      packDate: updatedCustomer.packDate,
      archiveDate: updatedCustomer.archiveDate,
      shipmentDate: updatedCustomer.shipmentDate,
      statusHistory: updatedCustomer.statusHistory
    };
  } catch (error) {
    console.error('更新客户状态出错:', error);
    throw error;
  }
}

/**
 * 获取按状态筛选的客户
 * @param {string} status - 客户状态
 * @returns {Promise<Array>} 客户数据列表
 */
async function getCustomersByStatusAPI(status) {
  try {
    const customers = await getCustomersByStatus(status);
    return customers.map(customer => ({
      id: customer.id,
      name: customer.name,
      status: customer.status,
      packProgress: customer.packProgress,
      packedCount: customer.packedCount,
      totalParts: customer.totalParts,
      packSeqs: customer.packSeqs,
      lastUpdate: customer.lastUpdate,
      packDate: customer.packDate,
      archiveDate: customer.archiveDate,
      shipmentDate: customer.shipmentDate
    }));
  } catch (error) {
    console.error('获取按状态筛选的客户出错:', error);
    throw error;
  }
}

module.exports = {
  getAllCustomersAPI,
  getCustomerAPI,
  updateCustomerStatusAPI,
  getCustomersByStatusAPI
};
