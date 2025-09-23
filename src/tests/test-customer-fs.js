/**
 * 测试customer-fs.js的动态路径配置
 */

const connection = require('../database/connection');
const { CustomerFS } = require('../database/models/customer-fs');

async function testCustomerFS() {
    console.log('🧪 开始测试customer-fs动态路径配置...');

    try {
        // 1. 切换到测试环境
        console.log('🔄 切换到测试环境...');
        const switchResult = connection.switchDatabase('testing');
        if (!switchResult) {
            throw new Error('环境切换失败');
        }
        console.log('✅ 环境切换成功');

        // 2. 检查CustomerFS的路径配置
        console.log('🔍 检查CustomerFS路径配置...');
        const currentPaths = CustomerFS.getCurrentPaths();
        console.log('当前路径配置:', currentPaths);

        const expectedPath = connection.getCurrentDbPath();
        if (!currentPaths.dataPath.includes('data-test')) {
            throw new Error('CustomerFS数据路径配置不正确');
        }
        console.log('✅ CustomerFS路径配置正确');

        // 3. 测试数据读取
        console.log('📖 测试数据读取...');
        const customerFS = new CustomerFS();
        const data = customerFS.readDataFile();
        console.log(`✅ 成功读取数据，包含 ${data.customers ? data.customers.length : 0} 个客户`);

        // 4. 测试面板数据读取
        console.log('📋 测试面板数据读取...');
        const panels = customerFS.readPanelsData();
        console.log(`✅ 成功读取面板数据，包含 ${panels.length} 个面板`);

        console.log('\n🎉 customer-fs动态路径配置测试通过！');
        console.log('📁 当前数据库路径:', expectedPath);

        return true;
    } catch (error) {
        console.error('❌ 测试失败:', error.message);
        return false;
    }
}

// 运行测试
if (require.main === module) {
    testCustomerFS()
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

module.exports = { testCustomerFS };