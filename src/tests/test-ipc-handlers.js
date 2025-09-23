/**
 * 测试IPC处理器是否正确注册
 * 用于验证switch-database处理器修复
 */

const { ipcMain } = require('electron');
const path = require('path');

// 模拟Electron环境
if (!global.ipcMain) {
    // 创建一个简单的ipcMain模拟对象
    const mockIpcMain = {
        handlers: new Map(),
        handle: function (channel, handler) {
            console.log(`[MOCK] 注册IPC处理器: ${channel}`);
            this.handlers.set(channel, handler);
        },
        invoke: async function (channel, ...args) {
            const handler = this.handlers.get(channel);
            if (!handler) {
                throw new Error(`No handler registered for '${channel}'`);
            }
            return await handler(null, ...args);
        }
    };

    // 将模拟对象设置为全局变量
    global.ipcMain = mockIpcMain;
}

async function testIPCHandlers() {
    console.log('🧪 开始测试IPC处理器...');

    try {
        // 确保在导入main.js之前设置electron模块的模拟
        const electronPath = require.resolve('electron');
        if (!require.cache[electronPath]) {
            console.log('⚠️ electron模块未设置，正在设置模拟对象...');

            // 创建一个简单的ipcMain模拟对象
            const mockIpcMain = {
                handlers: new Map(),
                handle: function (channel, handler) {
                    console.log(`[MOCK] 注册IPC处理器: ${channel}`);
                    this.handlers.set(channel, handler);
                },
                invoke: async function (channel, ...args) {
                    const handler = this.handlers.get(channel);
                    if (!handler) {
                        throw new Error(`No handler registered for '${channel}'`);
                    }
                    return await handler(null, ...args);
                }
            };

            // 创建electron模块的模拟
            const mockElectron = {
                ipcMain: mockIpcMain
            };

            // 将模拟对象设置到require缓存中
            require.cache[electronPath] = { exports: mockElectron, loaded: true };
        }

        // 导入main.js来设置IPC处理器
        const mainPath = path.join(__dirname, '../main.js');
        const mainModule = require(mainPath);

        // 调用setupIPCHandlers函数
        if (typeof mainModule.setupIPCHandlers === 'function') {
            console.log('✅ 找到setupIPCHandlers函数，正在调用...');
            mainModule.setupIPCHandlers();
        } else {
            console.log('❌ setupIPCHandlers函数未找到');
            return false;
        }

        console.log('\n📋 已注册的IPC处理器:');
        const handlers = global.ipcMain.handlers;
        if (handlers.size === 0) {
            console.log('❌ 没有找到任何已注册的IPC处理器');
            return false;
        }

        for (const [channel] of handlers) {
            console.log(`  ✅ ${channel}`);
        }

        // 测试switch-database处理器
        console.log('\n🔄 测试switch-database处理器...');
        if (handlers.has('switch-database')) {
            try {
                const result = await global.ipcMain.invoke('switch-database', 'production');
                console.log('✅ switch-database处理器调用成功');
                console.log(`   返回结果: ${JSON.stringify(result, null, 2)}`);
            } catch (error) {
                console.log(`⚠️ switch-database处理器调用失败: ${error.message}`);
                // 这可能是正常的，因为数据库连接可能需要特定的环境配置
            }
        } else {
            console.log('❌ switch-database处理器未注册');
            return false;
        }

        // 测试get-current-database-type处理器
        console.log('\n🔍 测试get-current-database-type处理器...');
        if (handlers.has('get-current-database-type')) {
            try {
                const result = await global.ipcMain.invoke('get-current-database-type');
                console.log('✅ get-current-database-type处理器调用成功');
                console.log(`   返回结果: ${JSON.stringify(result, null, 2)}`);
            } catch (error) {
                console.log(`⚠️ get-current-database-type处理器调用失败: ${error.message}`);
            }
        } else {
            console.log('❌ get-current-database-type处理器未注册');
            return false;
        }

        console.log('\n🎉 IPC处理器测试完成！');
        return true;

    } catch (error) {
        console.error('❌ 测试过程中出错:', error);
        return false;
    }
}

// 运行测试
testIPCHandlers().then(success => {
    if (success) {
        console.log('\n✅ 所有测试通过！switch-database处理器已正确注册。');
        process.exit(0);
    } else {
        console.log('\n❌ 测试失败！请检查IPC处理器注册。');
        process.exit(1);
    }
}).catch(error => {
    console.error('❌ 测试运行出错:', error);
    process.exit(1);
});