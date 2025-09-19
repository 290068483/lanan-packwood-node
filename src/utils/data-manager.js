const fs = require('fs');
const path = require('path');

// 确保数据目录存在
const dataDir = path.join(__dirname, '../../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'database.json');

// 初始化数据库文件（如果不存在）
if (!fs.existsSync(dbPath)) {
  const initialData = {
    customers: [],
    settings: {},
    history: []
  };
  fs.writeFileSync(dbPath, JSON.stringify(initialData, null, 2));
}

class DataManager {
  // 检查数据库连接状态
  static checkConnection() {
    try {
      // 尝试读取数据库文件来检查连接状态
      fs.accessSync(dbPath, fs.constants.R_OK | fs.constants.W_OK);
      return true;
    } catch (error) {
      console.error('数据库连接检查失败:', error.message);
      return false;
    }
  }

  // 读取数据库
  static readDB() {
    const data = fs.readFileSync(dbPath, 'utf8');
    return JSON.parse(data);
  }

  // 写入数据库
  static writeDB(data) {
    fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
  }
  // 添加或更新客户信息
  static upsertCustomer(customerData) {
    const db = this.readDB();
    const existingIndex = db.customers.findIndex(c => c.name === customerData.name);

    if (existingIndex >= 0) {
      // 更新现有客户
      db.customers[existingIndex] = { ...db.customers[existingIndex], ...customerData };
    } else {
      // 添加新客户
      db.customers.push(customerData);
    }

    this.writeDB(db);
  }

  // 获取所有客户信息
  static getAllCustomers() {
    const db = this.readDB();
    return db.customers;
  }

  // 根据名称获取客户信息
  static getCustomerByName(name) {
    const db = this.readDB();
    return db.customers.find(c => c.name === name);
  }

  // 根据名称删除客户信息
  static removeCustomer(name) {
    const db = this.readDB();
    const customerIndex = db.customers.findIndex(c => c.name === name);

    if (customerIndex >= 0) {
      db.customers.splice(customerIndex, 1);
      this.writeDB(db);
      return true;
    }
    return false;
  }

  // getCustomer的别名方法
  static getCustomer(name) {
    return this.getCustomerByName(name);
  }

  // 更新客户打包状态
  static updateCustomerStatus(name, status, remark = '') {
    const db = this.readDB();
    const customerIndex = db.customers.findIndex(c => c.name === name);

    if (customerIndex >= 0) {
      db.customers[customerIndex].status = status;
      db.customers[customerIndex].lastUpdate = new Date().toISOString();
      db.customers[customerIndex].remark = remark;
      this.writeDB(db);
    }
  }

  // 添加历史记录
  static addHistoryRecord(record) {
    const db = this.readDB();
    db.history.push({
      ...record,
      timestamp: new Date().toISOString()
    });
    this.writeDB(db);
  }



  // 获取历史记录
  static getHistoryRecords(limit = 100) {
    const db = this.readDB();
    // 返回最新的记录
    return db.history.slice(-limit);
  }



  // 保存设置
  static saveSettings(settings) {
    const db = this.readDB();
    db.settings = settings;
    this.writeDB(db);
  }

  // 获取设置
  static getSettings() {
    const db = this.readDB();
    return db.settings;
  }
}

module.exports = DataManager;