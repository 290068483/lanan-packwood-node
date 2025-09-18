/**
 * 数据库连接配置
 */

// 使用文件系统版本，避免编译问题
const { createOrUpdateCustomer, getCustomerById, getCustomerByName, getAllCustomers, updateCustomerStatus } = require('./models/customer-fs');
const path = require('path');

// 数据库文件路径
const dbPath = path.join(__dirname, '../../data', 'customer.db');

// 确保数据目录存在
const dataDir = path.dirname(dbPath);
if (!require('fs').existsSync(dataDir)) {
  require('fs').mkdirSync(dataDir, { recursive: true });
}

// 文件系统数据库连接
console.log('已连接到文件系统数据库');
// 初始化数据库
initializeDatabase();

/**
 * 初始化数据库
 */
function initializeDatabase() {
  console.log('文件系统数据库初始化完成');
}

/**
 * 关闭数据库连接
 */
function closeDatabase() {
  try {
    console.log('文件系统数据库已关闭');
  } catch (err) {
    console.error('关闭数据库失败:', err.message);
  }
}

module.exports = {
  // 数据库操作函数
  createOrUpdateCustomer,
  getCustomerById,
  getCustomerByName,
  getAllCustomers,
  updateCustomerStatus,
  closeDatabase
};
