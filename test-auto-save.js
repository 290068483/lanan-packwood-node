const CustomerPackageUtils = require('./src/utils/customer-package-utils');
const config = require('./config.json');

console.log('启动自动保存功能测试...');
CustomerPackageUtils.startAutoSave(config);