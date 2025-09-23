/**
 * 测试同步功能环境判断
 * 验证同步功能是否只在正式环境中运行
 */

const path = require('path');
const fs = require('fs');
const { getCurrentDbType, switchDatabase } = require('../database/connection');

// 测试函数
async function testSyncEnvironment() {
    console.log('=== 测试同步功能环境判断 ===');

    try {
        // 测试正式环境
        console.log('\n1. 测试正式环境...');
        switchDatabase('production');
        const prodDbType = getCurrentDbType();
        console.log(`当前数据库类型: ${prodDbType}`);

        // 模拟 main-service.js 的逻辑
        const configSyncPath = path.join(__dirname, '../../config-sync.json');
        let syncConfig = {};

        if (fs.existsSync(configSyncPath)) {
            syncConfig = JSON.parse(fs.readFileSync(configSyncPath, 'utf8'));
            console.log('同步配置加载成功');
        } else {
            console.error('同步配置文件不存在:', configSyncPath);
            return;
        }

        // 检查正式环境下的同步配置
        if (syncConfig.dataSync && syncConfig.dataSync.enabled) {
            if (prodDbType === 'production') {
                console.log('✅ 正式环境：同步功能应该启用');
                console.log(`   源路径: ${syncConfig.dataSync.sourcePath}`);
                console.log(`   本地路径: ${syncConfig.dataSync.localPath}`);
                console.log(`   数据库路径: ${syncConfig.dataSync.databasePath}`);
            } else {
                console.log('❌ 正式环境：同步功能被禁用');
            }
        }

        // 测试测试环境
        console.log('\n2. 测试测试环境...');
        switchDatabase('testing');
        const testDbType = getCurrentDbType();
        console.log(`当前数据库类型: ${testDbType}`);

        // 检查测试环境下的同步配置
        if (syncConfig.dataSync && syncConfig.dataSync.enabled) {
            if (testDbType === 'production') {
                console.log('❌ 测试环境：同步功能被错误启用');
            } else {
                console.log('✅ 测试环境：同步功能已禁用');
                console.log('   这是正确的行为，防止测试数据被同步');
            }
        }

        console.log('\n=== 测试完成 ===');
        console.log('总结:');
        console.log('- 正式环境: 同步功能应该启用');
        console.log('- 测试环境: 同步功能应该禁用');
        console.log('- 这样可以防止测试数据被错误同步到正式环境');

    } catch (error) {
        console.error('测试过程中出错:', error.message);
    }
}

// 运行测试
testSyncEnvironment();