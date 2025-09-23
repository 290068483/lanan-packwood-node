/**
 * 检查当前数据库环境状态
 * 用于诊断UI显示和实际环境不一致的问题
 */

const { getCurrentDbType, getCurrentEnvironmentConfig, switchDatabase } = require('../database/connection');
const envManager = require('../utils/env-manager');
const path = require('path');
const fs = require('fs');

async function checkCurrentEnvironment() {
    console.log('=== 检查当前数据库环境状态 ===');

    try {
        // 0. 先初始化默认环境（生产环境）
        console.log('🔄 初始化默认环境...');
        switchDatabase('production');
        console.log('✅ 环境初始化完成');
        console.log('=== 检查当前数据库环境状态 ===');

        try {
            // 1. 检查当前数据库类型
            const currentDbType = getCurrentDbType();
            console.log(`\n📊 当前数据库类型: ${currentDbType}`);

            // 2. 检查环境配置
            const envConfig = getCurrentEnvironmentConfig();
            console.log(`📋 环境配置名称: ${envConfig.name}`);
            console.log(`📁 数据库路径: ${envConfig.database?.path || '未配置'}`);

            // 3. 检查envManager状态
            console.log(`\n🔄 envManager状态:`);
            console.log(`   当前环境: ${envManager.getCurrentEnv()}`);
            console.log(`   是否为测试环境: ${envManager.isTesting()}`);
            console.log(`   是否为生产环境: ${envManager.isProduction()}`);

            // 4. 检查配置文件
            console.log(`\n📁 配置文件检查:`);
            const configFiles = ['config.json', 'config-sync.json'];

            for (const configFile of configFiles) {
                const configPath = path.join(__dirname, '../../', configFile);
                if (fs.existsSync(configPath)) {
                    console.log(`   ✅ ${configFile} 存在`);

                    try {
                        const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
                        if (configFile === 'config-sync.json' && config.dataSync) {
                            console.log(`      同步配置: ${config.dataSync.enabled ? '启用' : '禁用'}`);
                            console.log(`      源路径: ${config.dataSync.sourcePath}`);
                        }
                    } catch (error) {
                        console.log(`   ❌ ${configFile} 解析失败: ${error.message}`);
                    }
                } else {
                    console.log(`   ❌ ${configFile} 不存在`);
                }
            }

            // 5. 检查数据库文件
            console.log(`\n💾 数据库文件检查:`);
            const dbPath = envConfig.database?.path;
            if (dbPath) {
                const fullDbPath = path.join(__dirname, '../../', dbPath);
                console.log(`   数据库完整路径: ${fullDbPath}`);

                if (fs.existsSync(fullDbPath)) {
                    console.log(`   ✅ 数据库文件存在`);

                    // 检查文件大小和修改时间
                    const stats = fs.statSync(fullDbPath);
                    console.log(`   📊 文件大小: ${(stats.size / 1024).toFixed(2)} KB`);
                    console.log(`   🕒 修改时间: ${stats.mtime.toLocaleString()}`);

                    // 如果是目录，检查内容
                    if (stats.isDirectory()) {
                        const files = fs.readdirSync(fullDbPath);
                        console.log(`   📂 目录内容: ${files.length} 个文件`);
                        if (files.length > 0) {
                            console.log(`      文件列表: ${files.slice(0, 5).join(', ')}${files.length > 5 ? '...' : ''}`);
                        }
                    }
                } else {
                    console.log(`   ❌ 数据库文件不存在`);
                }
            } else {
                console.log(`   ❌ 数据库路径未配置`);
            }

            // 6. 诊断信息
            console.log(`\n🔍 诊断信息:`);

            // 检查一致性
            const envManagerEnv = envManager.getCurrentEnv();
            const dbConnectionEnv = currentDbType;

            if (envManagerEnv === dbConnectionEnv) {
                console.log(`   ✅ 环境状态一致: ${envManagerEnv}`);
            } else {
                console.log(`   ❌ 环境状态不一致:`);
                console.log(`      envManager: ${envManagerEnv}`);
                console.log(`      dbConnection: ${dbConnectionEnv}`);
            }

            // 检查UI显示逻辑
            console.log(`\n🖥️  UI显示预期:`);
            if (currentDbType === 'production') {
                console.log(`   UI应该显示: 生产数据库`);
                console.log(`   数据应该是: 正式数据`);
            } else if (currentDbType === 'testing') {
                console.log(`   UI应该显示: 测试数据库`);
                console.log(`   数据应该是: 测试数据`);
            } else {
                console.log(`   UI应该显示: 未知数据库`);
                console.log(`   数据应该是: 未知数据`);
            }

            console.log(`\n=== 检查完成 ===`);

        } catch (error) {
            console.error('检查过程中出错:', error.message);
        }
    } catch (error) {
        console.error('环境初始化过程中出错:', error.message);
    }
}

// 运行检查
checkCurrentEnvironment();