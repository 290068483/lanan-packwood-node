// 测试环境设置
const fs = require('fs');
const path = require('path');

// 确保测试数据目录存在
const testDataDir = path.join(__dirname, 'data');
if (!fs.existsSync(testDataDir)) {
  fs.mkdirSync(testDataDir, { recursive: true });
}

// 设置测试环境变量
process.env.NODE_ENV = 'test';
process.env.TEST_CONFIG = require('./config.test.json');
