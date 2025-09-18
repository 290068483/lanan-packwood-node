/**
 * 客户数据模型 - 重定向到文件系统版本
 */

// 重定向到文件系统版本
const { createOrUpdateCustomer, getCustomerById, getCustomerByName, getAllCustomers, updateCustomerStatus } = require('./customer-fs');

module.exports = {
  createOrUpdateCustomer,
  getCustomerById,
  getCustomerByName,
  getAllCustomers,
  updateCustomerStatus
};
