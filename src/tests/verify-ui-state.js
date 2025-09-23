/**
 * 验证UI状态和实际环境一致性
 */

const { getCurrentDbType, switchDatabase } = require('../database/connection');
const envManager = require('../utils/env-manager');

function verifyUIState() {
    console.log('=== 验证UI状态和实际环境一致性 ===');

    try {
        // 先初始化环境
        console.log('🔄 初始化环境...');
        switchDatabase('production');
        console.log('✅ 环境初始化完成');
        console.log('=== 验证UI状态和实际环境一致性 ===');

        try {
            const currentDbType = getCurrentDbType();
            const envManagerEnv = envManager.getCurrentEnv();

            console.log(`\n📊 当前状态:`);
            console.log(`   数据库连接类型: ${currentDbType}`);
            console.log(`   环境管理器类型: ${envManagerEnv}`);

            console.log(`\n🖥️  UI显示状态:`);
            if (currentDbType === 'production') {
                console.log(`   UI数据库选择器应该显示: "生产数据库"`);
                console.log(`   UI状态指示器应该显示: "生产环境"`);
                console.log(`   用户看到的数据应该是: 正式数据`);
            } else if (currentDbType === 'testing') {
                console.log(`   UI数据库选择器应该显示: "测试数据库"`);
                console.log(`   UI状态指示器应该显示: "测试环境"`);
                console.log(`   用户看到的数据应该是: 测试数据`);
            } else {
                console.log(`   UI数据库选择器应该显示: "未知"`);
                console.log(`   UI状态指示器应该显示: "未知环境"`);
                console.log(`   用户看到的数据应该是: 未知数据`);
            }

            console.log(`\n🔍 问题诊断:`);
            if (currentDbType === envManagerEnv) {
                console.log(`   ✅ 环境状态一致`);
                console.log(`   ✅ UI显示应该与实际环境匹配`);

                if (currentDbType === 'production') {
                    console.log(`\n🎯 结论:`);
                    console.log(`   用户看到的是正式数据，这是正确的！`);
                    console.log(`   系统当前在生产环境中运行。`);
                    console.log(`   如果我之前告诉用户是测试数据，那是我搞错了。`);
                } else {
                    console.log(`\n🎯 结论:`);
                    console.log(`   用户看到的是测试数据，这是正确的！`);
                    console.log(`   系统当前在测试环境中运行。`);
                }
            } else {
                console.log(`   ❌ 环境状态不一致`);
                console.log(`   ❌ UI显示可能与实际环境不匹配`);
                console.log(`\n🎯 结论:`);
                console.log(`   存在环境状态不一致的问题，需要修复。`);
            }

            console.log(`\n=== 验证完成 ===`);

        } catch (error) {
            console.error('验证过程中出错:', error.message);
        }
    }

// 运行验证
verifyUIState();