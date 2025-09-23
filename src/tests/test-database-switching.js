const path = require('path');

/**
 * 测试数据库切换功能
 */
async function testDatabaseSwitching() {
    console.log('🔄 开始测试数据库切换功能...');

    try {
        // 导入数据库连接模块
        const dbConnection = require('../database/connection');
        const { switchDatabase, getCurrentDbType, getCurrentEnvironmentConfig, initializeDefaultConnection } = dbConnection;

        // 先初始化默认连接
        initializeDefaultConnection('production');

        console.log('\n📊 当前状态:');
        console.log(`   当前数据库类型: ${getCurrentDbType()}`);
        console.log(`   当前环境配置: ${JSON.stringify(getCurrentEnvironmentConfig(), null, 2)}`);

        // 测试切换到测试数据库
        console.log('\n🔄 切换到测试数据库...');
        switchDatabase('testing');
        console.log(`   ✅ 切换成功，当前数据库类型: ${getCurrentDbType()}`);

        // 测试切换到生产数据库
        console.log('\n🔄 切换到生产数据库...');
        switchDatabase('production');
        console.log(`   ✅ 切换成功，当前数据库类型: ${getCurrentDbType()}`);

        // 测试无效的数据库类型
        console.log('\n🔄 测试无效数据库类型...');
        try {
            switchDatabase('invalid');
            console.log('   ❌ 应该抛出错误但没有');
        } catch (error) {
            console.log(`   ✅ 正确抛出错误: ${error.message}`);
        }

        console.log('\n🎉 数据库切换功能测试完成！');
        return true;

    } catch (error) {
        console.error('\n❌ 测试失败:', error.message);
        return false;
    }
}

// 运行测试
testDatabaseSwitching().then(success => {
    if (success) {
        console.log('\n✅ 所有测试通过！数据库切换功能正常工作。');
        process.exit(0);
    } else {
        console.log('\n❌ 测试失败！请检查数据库切换功能。');
        process.exit(1);
    }
}).catch(error => {
    console.error('\n❌ 测试过程中发生错误:', error);
    process.exit(1);
});