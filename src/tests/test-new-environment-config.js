const environmentConfig = require('../config/environment');

console.log('=== 新环境配置系统测试 ===\n');

// 测试1: 获取当前环境
console.log('1. 测试获取当前环境:');
const currentEnv = environmentConfig.getCurrentEnv();
console.log('当前环境:', currentEnv);

// 测试2: 获取完整配置
console.log('\n2. 测试获取完整配置:');
const config = environmentConfig.getConfig();
console.log('环境名称:', config.name);
console.log('数据库类型:', config.database.type);
console.log('数据库路径:', config.database.path);
console.log('API地址:', config.api.baseUrl);
console.log('日志级别:', config.logLevel);

// 测试3: 获取环境变量
console.log('\n3. 测试获取环境变量:');
const baseUrl = environmentConfig.getEnvVar('BASE_URL');
const dbPath = environmentConfig.getEnvVar('DB_PATH');
const logLevel = environmentConfig.getEnvVar('LOG_LEVEL');
console.log('BASE_URL:', baseUrl);
console.log('DB_PATH:', dbPath);
console.log('LOG_LEVEL:', logLevel);

// 测试4: 获取可用环境
console.log('\n4. 测试获取可用环境:');
const availableEnvs = environmentConfig.getAvailableEnvironments();
console.log('可用环境:', availableEnvs.join(', '));

// 测试5: 功能开关
console.log('\n5. 测试功能开关:');
console.log('热重载:', config.features.hotReload ? '启用' : '禁用');
console.log('调试模式:', config.features.debugMode ? '启用' : '禁用');
console.log('模拟数据:', config.features.mockData ? '启用' : '禁用');

// 测试6: 环境条件判断
console.log('\n6. 测试环境条件判断:');
if (currentEnv === 'development') {
    console.log('✓ 当前是开发环境');
} else if (currentEnv === 'production') {
    console.log('✓ 当前是生产环境');
} else if (currentEnv === 'testing') {
    console.log('✓ 当前是测试环境');
}

console.log('\n=== 测试完成 ===');

// 测试7: 验证配置完整性
console.log('\n7. 验证配置完整性:');
const requiredFields = ['env', 'name', 'database', 'basePath', 'api'];
const missingFields = requiredFields.filter(field => !config[field]);

if (missingFields.length === 0) {
    console.log('✓ 所有必需字段都存在');
} else {
    console.log('✗ 缺少字段:', missingFields.join(', '));
}

// 测试8: 验证数据库配置
console.log('\n8. 验证数据库配置:');
const dbConfig = config.database;
if (dbConfig && dbConfig.type && dbConfig.path) {
    console.log('✓ 数据库配置完整');
    console.log('  类型:', dbConfig.type);
    console.log('  路径:', dbConfig.path);
    console.log('  描述:', dbConfig.description || '无描述');
} else {
    console.log('✗ 数据库配置不完整');
}

// 测试9: 验证API配置
console.log('\n9. 验证API配置:');
const apiConfig = config.api;
if (apiConfig && apiConfig.baseUrl) {
    console.log('✓ API配置完整');
    console.log('  基础URL:', apiConfig.baseUrl);
    console.log('  超时时间:', apiConfig.timeout || '默认');
} else {
    console.log('✗ API配置不完整');
}

console.log('\n=== 所有测试完成 ===');