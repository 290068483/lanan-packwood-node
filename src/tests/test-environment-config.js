#!/usr/bin/env node

/**
 * 多环境配置系统测试脚本
 * 用于验证开发、生产、测试三个环境的配置加载和数据库连接
 */

const path = require('path');
const fs = require('fs');
const envManager = require('../utils/env-manager');
const dbConnection = require('../database/connection');

/**
 * 测试单个环境
 * @param {string} env - 环境名称
 */
async function testEnvironment(env) {
    console.log(`\n🧪 测试 ${env} 环境...`);

    try {
        // 加载环境配置
        const config = envManager.loadEnvironment(env);
        console.log(`✅ 配置加载成功: ${config.name}`);

        // 验证配置内容
        console.log(`📁 数据库路径: ${config.database?.path || '未配置'}`);
        console.log(`📁 源文件路径: ${config.sourcePath}`);
        console.log(`📁 本地路径: ${config.localPath}`);
        console.log(`🔧 日志级别: ${config.logLevel}`);

        // 测试数据库连接
        const dbPath = dbConnection.getDatabasePath(env);
        console.log(`📊 数据库路径: ${dbPath}`);

        // 检查数据库目录是否存在
        const dbDir = path.dirname(dbPath);
        if (!fs.existsSync(dbDir)) {
            console.log(`⚠️  数据库目录不存在: ${dbDir}`);
            // 创建数据库目录
            fs.mkdirSync(dbDir, { recursive: true });
            console.log(`✅ 已创建数据库目录: ${dbDir}`);
        }

        // 如果是测试环境，检查测试数据配置
        if (env === 'testing' && config.testData) {
            console.log(`🧪 测试数据配置:`);
            console.log(`   描述: ${config.testData.description}`);
            console.log(`   客户状态: ${config.testData.customerStates.join(', ')}`);
            console.log(`   面板状态: ${config.testData.panelStates.join(', ')}`);
        }

        // 测试环境检查函数
        console.log(`🔍 环境检查:`);
        console.log(`   是否开发环境: ${envManager.isDevelopment()}`);
        console.log(`   是否生产环境: ${envManager.isProduction()}`);
        console.log(`   是否测试环境: ${envManager.isTesting()}`);

        console.log(`✅ ${env} 环境测试通过\n`);
        return true;

    } catch (error) {
        console.error(`❌ ${env} 环境测试失败: ${error.message}\n`);
        return false;
    }
}

/**
 * 测试环境切换
 */
async function testEnvironmentSwitching() {
    console.log(`🔄 测试环境切换...`);

    const environments = ['development', 'production', 'testing'];

    for (let i = 0; i < environments.length; i++) {
        const env = environments[i];
        const nextEnv = environments[(i + 1) % environments.length];

        try {
            // 切换环境
            const newConfig = envManager.switchEnvironment(nextEnv);
            console.log(`✅ ${env} → ${nextEnv} 切换成功`);

            // 验证切换后的配置
            if (newConfig.name.toLowerCase().includes(nextEnv)) {
                console.log(`✅ 环境配置验证通过: ${newConfig.name}`);
            } else {
                console.warn(`⚠️  环境配置验证失败: 期望 ${nextEnv}, 实际 ${newConfig.name}`);
            }

        } catch (error) {
            console.error(`❌ ${env} → ${nextEnv} 切换失败: ${error.message}`);
        }
    }

    console.log(`✅ 环境切换测试完成\n`);
}

/**
 * 测试数据库连接
 */
async function testDatabaseConnections() {
    console.log(`🔗 测试数据库连接...`);

    const environments = ['development', 'production', 'testing'];

    for (const env of environments) {
        try {
            // 初始化数据库连接
            dbConnection.initializeDefaultConnection(env);

            // 获取数据库路径
            const dbPath = dbConnection.getDatabasePath(env);

            // 检查数据库文件或目录
            if (fs.existsSync(dbPath)) {
                console.log(`✅ ${env} 数据库连接正常: ${dbPath}`);
            } else {
                console.log(`⚠️  ${env} 数据库文件不存在: ${dbPath}`);

                // 对于测试环境，创建测试数据目录
                if (env === 'testing') {
                    const dbDir = path.dirname(dbPath);
                    if (!fs.existsSync(dbDir)) {
                        fs.mkdirSync(dbDir, { recursive: true });
                        console.log(`✅ 已创建测试数据库目录: ${dbDir}`);
                    }
                }
            }

        } catch (error) {
            console.error(`❌ ${env} 数据库连接失败: ${error.message}`);
        }
    }

    console.log(`✅ 数据库连接测试完成\n`);
}

/**
 * 主测试函数
 */
async function runTests() {
    console.log(`🚀 开始多环境配置系统测试...\n`);

    // 测试所有环境
    const environments = ['development', 'production', 'testing'];
    const results = {};

    for (const env of environments) {
        results[env] = await testEnvironment(env);
    }

    // 测试环境切换
    await testEnvironmentSwitching();

    // 测试数据库连接
    await testDatabaseConnections();

    // 输出测试结果摘要
    console.log(`📊 测试结果摘要:`);
    let passedCount = 0;

    for (const [env, result] of Object.entries(results)) {
        const status = result ? '✅ 通过' : '❌ 失败';
        console.log(`   ${env}: ${status}`);
        if (result) passedCount++;
    }

    console.log(`\n🎯 总体结果: ${passedCount}/${environments.length} 个环境测试通过`);

    if (passedCount === environments.length) {
        console.log(`🎉 所有环境测试通过！多环境配置系统工作正常。`);
    } else {
        console.log(`⚠️  部分环境测试失败，请检查配置文件。`);
    }
}

// 如果直接运行此脚本，执行测试
if (require.main === module) {
    runTests().catch(error => {
        console.error(`❌ 测试执行失败: ${error.message}`);
        process.exit(1);
    });
}

module.exports = {
    testEnvironment,
    testEnvironmentSwitching,
    testDatabaseConnections,
    runTests
};