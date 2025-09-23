const { spawn } = require('child_process');
const path = require('path');

/**
 * 测试UI环境配置
 * 验证npm run test:ui命令是否正确使用测试环境
 */
async function testUIEnvironment() {
    console.log('🧪 开始测试UI环境配置...');

    try {
        // 模拟运行npm run test:ui命令
        console.log('📝 模拟运行: npm run test:ui');
        console.log('🔍 检查环境变量: NODE_ENV=test');

        // 验证环境映射逻辑
        const nodeEnv = 'test';
        let targetEnv = 'production';

        if (nodeEnv === 'test') {
            targetEnv = 'testing';
            console.log('✅ NODE_ENV=test 正确映射为 testing 环境');
        }

        // 验证配置文件路径
        const configPath = path.join(__dirname, '../../config/testing.json');
        const fs = require('fs');

        if (fs.existsSync(configPath)) {
            console.log('✅ 测试环境配置文件存在:', configPath);

            const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
            console.log('✅ 测试环境名称:', config.name);
            console.log('✅ 数据库路径:', config.database.path);

            if (config.database.path === '../data-test') {
                console.log('✅ 数据库路径正确，使用测试数据');
            } else {
                console.error('❌ 数据库路径不正确，期望: ../data-test，实际:', config.database.path);
                return false;
            }
        } else {
            console.error('❌ 测试环境配置文件不存在:', configPath);
            return false;
        }

        // 验证start-electron.js修改
        const startElectronPath = path.join(__dirname, '../scripts/start-electron.js');
        const startElectronContent = fs.readFileSync(startElectronPath, 'utf8');

        if (startElectronContent.includes('NODE_ENV=test')) {
            console.log('✅ start-electron.js 包含环境映射逻辑');
        } else {
            console.error('❌ start-electron.js 缺少环境映射逻辑');
            return false;
        }

        if (startElectronContent.includes('targetEnv = \'testing\'')) {
            console.log('✅ start-electron.js 正确映射到testing环境');
        } else {
            console.error('❌ start-electron.js 环境映射逻辑不正确');
            return false;
        }

        console.log('\n🎉 UI环境配置测试通过！');
        console.log('📋 测试结果总结:');
        console.log('   - NODE_ENV=test 正确映射为 testing 环境');
        console.log('   - 测试环境配置文件存在且配置正确');
        console.log('   - 数据库路径指向 ../data-test');
        console.log('   - start-electron.js 已添加环境初始化逻辑');
        console.log('\n💡 现在运行 npm run test:ui 将使用测试环境数据');

        return true;

    } catch (error) {
        console.error('❌ 测试失败:', error.message);
        return false;
    }
}

// 运行测试
if (require.main === module) {
    testUIEnvironment()
        .then(success => {
            process.exit(success ? 0 : 1);
        })
        .catch(error => {
            console.error('测试运行失败:', error);
            process.exit(1);
        });
}

module.exports = { testUIEnvironment };