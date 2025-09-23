/**
 * 环境配置使用示例
 * 展示如何在项目中使用新的环境配置系统
 */

const environmentConfig = require('./environment');

// 获取当前环境配置
const config = environmentConfig.getConfig();
console.log('当前环境:', config.env);
console.log('环境名称:', config.name);
console.log('数据库配置:', config.database);
console.log('API配置:', config.api);

// 获取特定环境变量
const dbPath = environmentConfig.getEnvVar('DB_PATH');
const logLevel = environmentConfig.getEnvVar('LOG_LEVEL');
console.log('数据库路径:', dbPath);
console.log('日志级别:', logLevel);

// 获取当前环境名称
const currentEnv = environmentConfig.getCurrentEnv();
console.log('当前环境:', currentEnv);

// 获取所有可用环境
const availableEnvs = environmentConfig.getAvailableEnvironments();
console.log('可用环境:', availableEnvs);

// 切换环境示例（通常在用户操作时调用）
// environmentConfig.switchEnvironment('production');

// 在不同环境下的条件判断
if (currentEnv === 'development') {
    console.log('开发环境特殊逻辑');
    // 开发环境特有的配置或逻辑
} else if (currentEnv === 'production') {
    console.log('生产环境特殊逻辑');
    // 生产环境特有的配置或逻辑
} else if (currentEnv === 'testing') {
    console.log('测试环境特殊逻辑');
    // 测试环境特有的配置或逻辑
}

// 数据库连接示例
function connectToDatabase() {
    const dbConfig = config.database;
    console.log(`连接到${dbConfig.type}数据库: ${dbConfig.path}`);
    // 这里应该是实际的数据库连接逻辑
    return {
        type: dbConfig.type,
        path: dbConfig.path,
        connected: true
    };
}

// API请求示例
function makeApiRequest() {
    const apiConfig = config.api;
    console.log(`API请求到: ${apiConfig.baseUrl}`);
    // 这里应该是实际的API请求逻辑
    return {
        baseUrl: apiConfig.baseUrl,
        timeout: apiConfig.timeout
    };
}

// 文件路径处理示例
function getStoragePath() {
    const basePath = config.basePath;
    const storagePath = basePath.projectStorage;
    console.log(`存储路径: ${storagePath}`);
    return storagePath;
}

// 功能开关示例
function isFeatureEnabled(featureName) {
    return config.features[featureName] || false;
}

// 使用示例
console.log('\n=== 使用示例 ===');

// 1. 数据库连接
const dbConnection = connectToDatabase();
console.log('数据库连接状态:', dbConnection.connected ? '已连接' : '未连接');

// 2. API请求
const apiConfig = makeApiRequest();
console.log('API配置:', apiConfig);

// 3. 存储路径
const storagePath = getStoragePath();
console.log('存储路径:', storagePath);

// 4. 功能开关
console.log('热重载功能:', isFeatureEnabled('hotReload') ? '启用' : '禁用');
console.log('调试模式:', isFeatureEnabled('debugMode') ? '启用' : '禁用');
console.log('模拟数据:', isFeatureEnabled('mockData') ? '启用' : '禁用');

module.exports = {
    environmentConfig,
    connectToDatabase,
    makeApiRequest,
    getStoragePath,
    isFeatureEnabled
};