/**
 * 数据库连接配置
 */

const fs = require('fs');
const path = require('path');
const envManager = require('../utils/env-manager');

// 当前数据库路径
let currentDbPath = null;
let currentDbType = null;

// 数据库操作函数
let dbOperations = null;

/**
 * 切换数据库
 * @param {string} env - 环境名称 ('development', 'production', 'testing')
 */
// 切换数据库
function switchDatabase(env) {
  try {
    // 加载环境配置
    const config = envManager.loadEnvironment(env);

    currentDbType = env;
    // 修复路径计算问题：确保正确解析相对路径到项目根目录
    const projectRoot = path.join(__dirname, '../../');
    // 如果配置路径是相对路径（以./或../开头），则相对于项目根目录解析
    if (config.database.path.startsWith('./')) {
      currentDbPath = path.resolve(projectRoot, config.database.path.substring(2));
    } else if (config.database.path.startsWith('../')) {
      currentDbPath = path.resolve(projectRoot, config.database.path.substring(3));
    } else {
      currentDbPath = path.resolve(projectRoot, config.database.path);
    }

    // 确保数据目录存在
    ensureDataDirectory();

    // 重新加载数据库操作函数
    const { CustomerFS } = require('./models/customer-fs');

    // 修改customer-fs模块的数据路径
    CustomerFS.setDataPath(currentDbPath);

    dbOperations = {
      createOrUpdateCustomer: CustomerFS.createOrUpdateCustomer,
      getCustomerById: CustomerFS.getCustomerById,
      getCustomerByName: CustomerFS.getCustomerByName,
      getAllCustomers: CustomerFS.getAllCustomers,
      updateCustomerStatus: CustomerFS.updateCustomerStatus
    };

    console.log(`✅ 已切换到${config.name}数据库`);
    initializeDatabase();

    return true;
  } catch (error) {
    console.error(`❌ 切换数据库失败: ${error.message}`);
    return false;
  }
}

/**
 * 获取当前数据库类型
 * @returns {string} 当前数据库类型
 */
function getCurrentDbType() {
  return currentDbType;
}

/**
 * 获取当前数据库路径
 * @returns {string} 当前数据库路径
 */
function getCurrentDbPath() {
  return currentDbPath;
}

/**
 * 获取指定环境的数据库路径
 * @param {string} env - 环境名称
 * @returns {string} 数据库路径
 */
function getDatabasePath(env) {
  try {
    const config = envManager.loadEnvironment(env);
    // 修复路径计算问题：确保正确解析相对路径到项目根目录
    const projectRoot = path.join(__dirname, '../../');
    // 如果配置路径是相对路径（以./或../开头），则相对于项目根目录解析
    if (config.database.path.startsWith('./')) {
      return path.resolve(projectRoot, config.database.path.substring(2));
    } else if (config.database.path.startsWith('../')) {
      return path.resolve(projectRoot, config.database.path.substring(3));
    } else {
      return path.resolve(projectRoot, config.database.path);
    }
  } catch (error) {
    console.error(`获取${env}环境数据库路径失败: ${error.message}`);
    return null;
  }
}

// 确保数据目录存在
function ensureDataDirectory() {
  if (currentDbPath && !fs.existsSync(currentDbPath)) {
    fs.mkdirSync(currentDbPath, { recursive: true });
    console.log(`✅ 创建数据目录: ${currentDbPath}`);
  }
}

/**
 * 初始化默认数据库连接
 * @param {string} env - 环境名称，默认为生产环境
 */
function initializeDefaultConnection(env = 'production') {
  try {
    switchDatabase(env);
  } catch (error) {
    console.error(`初始化数据库连接失败: ${error.message}`);
    // 如果指定环境失败，尝试使用生产环境
    if (env !== 'production') {
      console.log('尝试连接生产环境...');
      switchDatabase('production');
    }
  }
}

// 延迟初始化，等待应用启动时指定环境
// 不在这里自动初始化，改为由应用启动时调用

/**
 * 初始化数据库
 */
function initializeDatabase() {
  if (!currentDbType || !currentDbPath) {
    console.warn('⚠️ 数据库未正确初始化');
    return;
  }

  const config = envManager.getCurrentConfig();
  console.log(`✅ ${config.name}数据库初始化完成`);
  console.log(`📁 数据库路径: ${currentDbPath}`);

  // 如果是测试环境，显示测试数据信息
  if (envManager.isTesting() && config.testData) {
    console.log(`🧪 测试数据: ${config.testData.description}`);
  }
}

/**
 * 关闭数据库连接
 */
function closeDatabase() {
  try {
    if (currentDbType) {
      const config = envManager.getCurrentConfig();
      console.log(`✅ ${config.name}数据库已关闭`);
    }
  } catch (err) {
    console.error('关闭数据库失败:', err.message);
  }
}

/**
 * 获取所有可用环境
 * @returns {string[]} 环境列表
 */
function getAvailableEnvironments() {
  return envManager.getAvailableEnvironments();
}

/**
 * 获取当前环境配置
 * @returns {Object} 环境配置
 */
function getCurrentEnvironmentConfig() {
  return envManager.getCurrentConfig();
}

module.exports = {
  // 数据库操作函数
  createOrUpdateCustomer: (...args) => {
    if (!dbOperations) throw new Error('数据库未初始化');
    return dbOperations.createOrUpdateCustomer(...args);
  },
  getCustomerById: (...args) => {
    if (!dbOperations) throw new Error('数据库未初始化');
    return dbOperations.getCustomerById(...args);
  },
  getCustomerByName: (...args) => {
    if (!dbOperations) throw new Error('数据库未初始化');
    return dbOperations.getCustomerByName(...args);
  },
  getAllCustomers: (...args) => {
    if (!dbOperations) throw new Error('数据库未初始化');
    return dbOperations.getAllCustomers(...args);
  },
  updateCustomerStatus: (...args) => {
    if (!dbOperations) throw new Error('数据库未初始化');
    return dbOperations.updateCustomerStatus(...args);
  },
  // 数据库切换函数
  switchDatabase,
  getCurrentDbType,
  getCurrentDbPath,
  getDatabasePath,
  initializeDefaultConnection,
  closeDatabase,
  getAvailableEnvironments,
  getCurrentEnvironmentConfig
};