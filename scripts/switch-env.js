#!/usr/bin/env node

/**
 * 环境切换工具
 * 使用方法: node scripts/switch-env.js [environment]
 * 示例: node scripts/switch-env.js production
 */

const environmentConfig = require('../src/config/environment');

function showHelp() {
    console.log('\n环境切换工具');
    console.log('使用方法: node scripts/switch-env.js [environment]');
    console.log('\n可用环境:');
    const envs = environmentConfig.getAvailableEnvironments();
    envs.forEach(env => {
        console.log(`  - ${env}`);
    });
    console.log('\n示例:');
    console.log('  node scripts/switch-env.js production');
    console.log('  node scripts/switch-env.js testing');
    console.log('  node scripts/switch-env.js development');
}

function showCurrentEnv() {
    const currentEnv = environmentConfig.getCurrentEnv();
    const config = environmentConfig.getConfig();
    console.log(`\n当前环境: ${currentEnv}`);
    console.log(`环境名称: ${config.name}`);
    console.log(`数据库路径: ${config.database.path}`);
    console.log(`日志级别: ${config.logLevel}`);
}

function switchEnvironment(targetEnv) {
    const availableEnvs = environmentConfig.getAvailableEnvironments();

    if (!availableEnvs.includes(targetEnv)) {
        console.error(`错误: 不支持的环境 '${targetEnv}'`);
        console.log(`可用环境: ${availableEnvs.join(', ')}`);
        process.exit(1);
    }

    const oldEnv = environmentConfig.getCurrentEnv();
    environmentConfig.switchEnvironment(targetEnv);

    console.log(`\n✅ 环境切换成功!`);
    console.log(`从: ${oldEnv}`);
    console.log(`到: ${targetEnv}`);

    const config = environmentConfig.getConfig();
    console.log(`\n新环境配置:`);
    console.log(`  环境名称: ${config.name}`);
    console.log(`  数据库路径: ${config.database.path}`);
    console.log(`  API地址: ${config.api.baseUrl}`);
    console.log(`  日志级别: ${config.logLevel}`);
    console.log(`  调试模式: ${config.features.debugMode}`);
}

// 主函数
function main() {
    const args = process.argv.slice(2);

    if (args.length === 0) {
        showCurrentEnv();
        showHelp();
        return;
    }

    const command = args[0];

    if (command === '--help' || command === '-h') {
        showHelp();
        return;
    }

    if (command === '--current' || command === '-c') {
        showCurrentEnv();
        return;
    }

    // 切换环境
    switchEnvironment(command);
}

// 如果直接运行此脚本
if (require.main === module) {
    main();
}

module.exports = {
    switchEnvironment,
    showCurrentEnv,
    showHelp
};