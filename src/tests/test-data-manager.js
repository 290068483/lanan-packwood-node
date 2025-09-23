/**
 * 测试data-manager.js的动态路径配置
 */

const connection = require('../database/connection');
const dataManager = require('../utils/data-manager');

async function testDataManager() {
    console.log('🧪 开始测试data-manager动态路径配置...');

    try {
        // 1. 切换到测试环境
        console.log('🔄 切换到测试环境...');
        const switchResult = connection.switchDatabase('testing');
        if (!switchResult) {
            throw new Error('环境切换失败');
        }
        console.log('✅ 环境切换成功');

        // 2. 检查连接状态
        console.log('🔍 检查数据库连接状态...');
        const connectionStatus = await dataManager.checkConnection();
        console.log('连接状态:', connectionStatus);

        if (!connectionStatus.connected) {
            throw new Error('数据库连接失败: ' + connectionStatus.message);
        }
        console.log('✅ 数据库连接正常');

        // 3. 获取所有客户
        console.log('📋 获取所有客户数据...');
        const customers = await dataManager.getAllCustomers();
        console.log(`✅ 找到 ${customers.length} 个客户`);

        // 4. 获取历史记录
        console.log('📜 获取历史记录...');
        const history = dataManager.getHistoryRecords(5);
        console.log(`✅ 找到 ${history.length} 条历史记录`);

        // 5. 获取设置
        console.log('⚙️ 获取设置...');
        const settings = dataManager.getSettings();
        console.log('✅ 设置获取成功');

        console.log('\n🎉 data-manager动态路径配置测试通过！');
        console.log('📁 当前数据库路径:', connection.getCurrentDbPath());

        return true;
    } catch (error) {
        console.error('❌ 测试失败:', error.message);
        return false;
    }
}

// 运行测试
if (require.main === module) {
    testDataManager()
        .then(success => {
            if (success) {
                console.log('\n✅ 所有测试通过！');
                process.exit(0);
            } else {
                console.log('\n❌ 测试失败！');
                process.exit(1);
            }
        })
        .catch(error => {
            console.error('💥 测试异常:', error);
            process.exit(1);
        });
}

module.exports = { testDataManager };