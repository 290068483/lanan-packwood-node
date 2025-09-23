/**
 * 验证测试环境是否正确使用测试数据
 */

const envManager = require('../utils/env-manager');
const dbConnection = require('../database/connection');
const path = require('path');
const fs = require('fs');

console.log('🧪 开始验证测试数据使用情况...');

// 1. 检查环境配置
console.log('\n📋 1. 检查环境配置:');
const config = envManager.loadEnvironment('testing');
console.log(`   环境名称: ${config.name}`);
console.log(`   数据库路径配置: ${config.database.path}`);

// 2. 检查实际解析的数据库路径
console.log('\n📁 2. 检查实际数据库路径:');
const actualDbPath = dbConnection.getDatabasePath('testing');
console.log(`   实际数据库路径: ${actualDbPath}`);
console.log(`   路径是否存在: ${fs.existsSync(actualDbPath) ? '✅ 是' : '❌ 否'}`);

// 3. 检查测试数据目录内容
console.log('\n📂 3. 检查测试数据目录内容:');
if (fs.existsSync(actualDbPath)) {
    const customersPath = path.join(actualDbPath, 'customers');
    if (fs.existsSync(customersPath)) {
        const customerDirs = fs.readdirSync(customersPath);
        console.log(`   客户目录: ${customerDirs.join(', ')}`);

        // 检查测试客户数据
        const testCustomers = customerDirs.filter(dir => dir.startsWith('测试客户'));
        console.log(`   测试客户数量: ${testCustomers.length}`);
        console.log(`   测试客户: ${testCustomers.join(', ')}`);

        if (testCustomers.length > 0) {
            console.log('   ✅ 找到测试客户数据');
        } else {
            console.log('   ❌ 未找到测试客户数据');
        }
    } else {
        console.log('   ❌ customers目录不存在');
    }
} else {
    console.log('   ❌ 数据库路径不存在');
}

// 4. 检查正式数据目录内容作为对比
console.log('\n📂 4. 检查正式数据目录作为对比:');
const prodDbPath = dbConnection.getDatabasePath('production');
console.log(`   正式数据库路径: ${prodDbPath}`);
if (fs.existsSync(prodDbPath)) {
    const prodCustomersPath = path.join(prodDbPath, 'customers');
    if (fs.existsSync(prodCustomersPath)) {
        const prodCustomerDirs = fs.readdirSync(prodCustomersPath);
        console.log(`   正式客户目录: ${prodCustomerDirs.join(', ')}`);

        // 检查是否有测试客户数据混入正式环境
        const testCustomersInProd = prodCustomerDirs.filter(dir => dir.startsWith('测试客户'));
        if (testCustomersInProd.length > 0) {
            console.log(`   ⚠️  正式环境中发现测试客户: ${testCustomersInProd.join(', ')}`);
        } else {
            console.log('   ✅ 正式环境中没有测试客户数据');
        }
    }
}

// 5. 初始化数据库连接并测试数据读取
console.log('\n🔗 5. 测试数据库连接和数据读取:');
try {
    dbConnection.initializeDefaultConnection('testing');
    // 使用CustomerFS实例直接调用方法
    const { CustomerFS } = require('../database/models/customer-fs');
    const customerFS = new CustomerFS();
    const customers = customerFS.getAllCustomers();
    console.log(`   成功读取客户数据: ${customers.length} 条`);

    // 检查是否包含测试客户
    const testCustomersData = customers.filter(c => c.name && c.name.startsWith('测试客户'));
    console.log(`   测试客户数据: ${testCustomersData.length} 条`);

    if (testCustomersData.length > 0) {
        console.log('   ✅ 测试环境正确使用测试数据');
        testCustomersData.forEach(c => {
            console.log(`      - ${c.name}: ${c.status || '未知状态'}`);
        });
    } else {
        console.log('   ❌ 测试环境未使用测试数据');
    }
} catch (error) {
    console.error(`   ❌ 数据库连接失败: ${error.message}`);
}

console.log('\n🎉 验证完成！');