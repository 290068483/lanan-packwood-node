/**
 * 数据库连接配置
 */

const fs = require('fs');
const path = require('path');

// 数据库路径配置
const DATABASE_PATHS = {
  production: path.join(__dirname, '../../data'),
  test: path.join(__dirname, '../data-test')
};

// 当前数据库类型，默认为生产环境
let currentDbType = 'production';
let currentDbPath = DATABASE_PATHS.production;

// 数据库操作函数
let dbOperations = null;

/**
 * 切换数据库
 * @param {string} dbType - 数据库类型 ('production' 或 'test')
 */
function switchDatabase(dbType) {
  if (!DATABASE_PATHS[dbType]) {
    throw new Error(`不支持的数据库类型: ${dbType}`);
  }

  currentDbType = dbType;
  currentDbPath = DATABASE_PATHS[dbType];

  // 重新加载数据库操作函数
  const CustomerFS = require('./models/customer-fs');

  // 修改customer-fs模块的数据路径
  CustomerFS.setDataPath(currentDbPath);

  dbOperations = {
    createOrUpdateCustomer: CustomerFS.createOrUpdateCustomer,
    getCustomerById: CustomerFS.getCustomerById,
    getCustomerByName: CustomerFS.getCustomerByName,
    getAllCustomers: CustomerFS.getAllCustomers,
    updateCustomerStatus: CustomerFS.updateCustomerStatus
  };

  console.log(`已切换到${dbType === 'production' ? '生产' : '测试'}数据库`);
  initializeDatabase();
}

/**
 * 获取当前数据库类型
 * @returns {string} 当前数据库类型
 */
function getCurrentDbType() {
  return currentDbType;
}

// 确保数据目录存在
function ensureDataDirectory() {
  if (!fs.existsSync(currentDbPath)) {
    fs.mkdirSync(currentDbPath, { recursive: true });
  }
}

// 初始化默认数据库连接
ensureDataDirectory();
switchDatabase('production');

/**
 * 初始化数据库
 */
function initializeDatabase() {
  console.log(`${currentDbType === 'production' ? '生产' : '测试'}数据库初始化完成`);
}

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
    console.log(`${currentDbType === 'production' ? '生产' : '测试'}数据库已关闭`);
  } catch (err) {
    console.error('关闭数据库失败:', err.message);
  }
}

module.exports = {
  // 数据库操作函数
  createOrUpdateCustomer: (...args) => dbOperations.createOrUpdateCustomer(...args),
  getCustomerById: (...args) => dbOperations.getCustomerById(...args),
  getCustomerByName: (...args) => dbOperations.getCustomerByName(...args),
  getAllCustomers: (...args) => dbOperations.getAllCustomers(...args),
  updateCustomerStatus: (...args) => dbOperations.updateCustomerStatus(...args),
  // 数据库切换函数
  switchDatabase,
  getCurrentDbType,
  closeDatabase
};