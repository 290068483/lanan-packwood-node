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
  
  // 定时清理旧数据（保留最近30天）
  static cleanupOldData(daysToKeep = 30) {
    const db = this.readDB();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
    
    // 清理旧的历史记录
    db.history = db.history.filter(record => new Date(record.timestamp) >= cutoffDate);
    
    this.writeDB(db);
    
    // 注意：这里不清理客户信息，因为您提到前期不会删除客户数据
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