const path = require('path');

// 设置控制台编码为UTF-8，解决乱码问题
if (process.platform === 'win32') {
    const { exec } = require('child_process');
    exec('chcp 65001', (error, stdout, stderr) => {
        if (error) {
            console.error('设置控制台编码时出错:', error);
        }
    });
}

// 环境初始化 - 将NODE_ENV=test映射为testing环境
let envManager;
try {
    console.log('[ELECTRON] 开始初始化环境配置...');

    // 导入环境管理器
    envManager = require('../utils/env-manager');

    // 确定要使用的环境
    let targetEnv = 'production'; // 默认环境

    if (process.env.NODE_ENV === 'test') {
        targetEnv = 'testing';
        console.log('[ELECTRON] 检测到NODE_ENV=test，映射为testing环境');
    } else if (process.env.NODE_ENV === 'development') {
        targetEnv = 'development';
        console.log('[ELECTRON] 使用development环境');
    } else if (process.env.NODE_ENV === 'production') {
        targetEnv = 'production';
        console.log('[ELECTRON] 使用production环境');
    }

    // 加载环境配置
    const config = envManager.loadEnvironment(targetEnv);
    console.log(`[ELECTRON] ${config.name}配置加载成功`);

    // 初始化数据库连接
    const dbConnection = require('../database/connection');
    dbConnection.initializeDefaultConnection(targetEnv);
    console.log(`[ELECTRON] 数据库连接初始化完成，使用${targetEnv}环境`);

} catch (error) {
    console.error('[ELECTRON] 环境初始化失败:', error);
    // 环境初始化失败不影响应用启动，使用默认配置
}

// 检查是否在electron环境中运行
if (process.versions.electron) {
    // 在electron环境中运行
    const { app, BrowserWindow, ipcMain } = require('electron');

    // 设置用户数据路径以解决缓存权限问题
    app.setPath('userData', path.join(app.getPath('appData'), 'PackNode'));

    // 禁用安全警告
    process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = 'true';

    // 确保只有一个应用实例
    const gotTheLock = app.requestSingleInstanceLock();

    if (!gotTheLock) {
        console.log('[ELECTRON] 应用已在运行，退出当前实例');
        app.quit();
        return;
    } else {
        console.log('[ELECTRON] 获得单实例锁，启动应用');
    }

    // 当第二个实例启动时，聚焦到主窗口
    app.on('second-instance', () => {
        if (mainWindow) {
            if (mainWindow.isMinimized()) mainWindow.restore();
            mainWindow.focus();
        }
    });

    let mainWindow;

    function createWindow() {
        mainWindow = new BrowserWindow({
            width: 1200,
            height: 800,
            webPreferences: {
                sandbox: false,
                preload: path.join(__dirname, '../ui/electron-preload.js'),
                nodeIntegration: false,
                contextIsolation: true,
                experimentalFeatures: false,
                webviewTag: false
            }
        });

        // 加载主界面
        mainWindow.loadFile(path.join(__dirname, '../ui/index.html'));

        // 开发环境下打开开发者工具
        if (process.env.NODE_ENV === 'development') {
            mainWindow.webContents.openDevTools();
        }

        mainWindow.on('closed', function () {
            mainWindow = null;
        });
    }

    // 设置IPC处理器
    function setupIpcHandlers(window) {
        console.log('[ELECTRON] 开始注册IPC处理器...');

        // 设置window引用
        if (window) {
            mainWindow = window;
        }

        let configManager, DataManager;

        // 尝试导入功能模块
        try {
            console.log('[ELECTRON] 正在导入 config-manager...');
            configManager = require('../utils/config-manager');
            console.log('[ELECTRON] config-manager 导入成功');
        } catch (error) {
            console.error('[ELECTRON] config-manager 导入失败:', error);
            // 创建一个简单的配置管理器作为备用
            configManager = {
                getConfig: async () => ({ database: { type: 'lowdb' } })
            };
        }

        try {
            console.log('[ELECTRON] 正在导入 data-manager...');
            DataManager = require('../utils/data-manager');
            console.log('[ELECTRON] data-manager 导入成功');
        } catch (error) {
            console.error('[ELECTRON] data-manager 导入失败:', error);
            // 创建一个简单的数据管理器作为备用
            DataManager = {
                getAllCustomers: async () => [],
                upsertCustomer: async () => { },
                updateCustomerStatus: async () => { },
                updateCustomerShipment: async () => { }
            };
        }

        // 检查数据库连接
        ipcMain.handle('check-database-connection', async () => {
            console.log('[IPC] 处理 check-database-connection 请求');
            try {
                // 简单的数据库连接检查
                await DataManager.getAllCustomers();
                return { success: true, message: '数据库连接正常' };
            } catch (error) {
                console.error('数据库连接检查失败:', error);
                return { success: false, message: `数据库连接失败: ${error.message}` };
            }
        });
        console.log('[ELECTRON] IPC处理器 check-database-connection 注册完成');

        // 获取配置
        ipcMain.handle('get-config', async () => {
            console.log('[IPC] 处理 get-config 请求');
            try {
                const config = await configManager.getConfig();
                return config;
            } catch (error) {
                console.error('获取配置失败:', error);
                return {};
            }
        });
        console.log('[ELECTRON] IPC处理器 get-config 注册完成');

        // 获取当前数据库类型
        ipcMain.handle('get-current-database-type', async () => {
            console.log('[IPC] 处理 get-current-database-type 请求');
            try {
                const config = await configManager.getConfig();
                return config.database?.type || 'lowdb';
            } catch (error) {
                console.error('获取数据库类型失败:', error);
                return 'lowdb';
            }
        });
        console.log('[ELECTRON] IPC处理器 get-current-database-type 注册完成');

        // 获取所有客户数据
        ipcMain.handle('get-customers', async () => {
            console.log('[IPC] 处理 get-customers 请求');
            try {
                const customers = await DataManager.getAllCustomers();
                return customers;
            } catch (error) {
                console.error('获取客户数据时出错:', error);
                return [];
            }
        });
        console.log('[ELECTRON] IPC处理器 get-customers 注册完成');

        // 添加客户
        ipcMain.handle('add-customer', async (event, customer) => {
            console.log('[IPC] 处理 add-customer 请求');
            try {
                await DataManager.upsertCustomer(customer);
                return { success: true };
            } catch (error) {
                console.error('添加客户数据失败:', error);
                return { success: false, error: `添加客户数据失败: ${error.message}` };
            }
        });
        console.log('[ELECTRON] IPC处理器 add-customer 注册完成');

        // 更新客户状态
        ipcMain.handle('update-customer-status', async (_event, customerName, status, remark) => {
            console.log('[IPC] 处理 update-customer-status 请求');
            try {
                await DataManager.updateCustomerStatus(customerName, status, remark);
                return { success: true };
            } catch (error) {
                console.error('更新客户状态时出错:', error);
                throw error;
            }
        });
        console.log('[ELECTRON] IPC处理器 update-customer-status 注册完成');

        // 发货客户 - 修复bug：只更新出货状态，不覆盖客户状态
        ipcMain.handle('ship-customer', async (event, customerName, shippingInfo) => {
            console.log('[IPC] 处理 ship-customer 请求');
            try {
                // 使用专门的出货状态更新方法，而不是覆盖客户状态
                if (typeof DataManager.updateCustomerShipment === 'function') {
                    await DataManager.updateCustomerShipment(customerName, shippingInfo);
                } else {
                    // 如果没有专门的出货更新方法，则使用upsertCustomer来更新出货相关字段
                    const customer = await DataManager.getCustomer(customerName);
                    if (customer) {
                        customer.shipmentDate = new Date().toISOString();
                        customer.shipmentStatus = 'shipped';
                        customer.shipmentRemark = shippingInfo?.remark || '已发货';
                        customer.shipmentInfo = shippingInfo || {};
                        await DataManager.upsertCustomer(customer);
                    }
                }
                return { success: true, message: `客户 ${customerName} 发货成功` };
            } catch (error) {
                console.error('发货客户失败:', error);
                return { success: false, error: `发货客户失败: ${error.message}` };
            }
        });
        console.log('[ELECTRON] IPC处理器 ship-customer 注册完成');

        // 数据库切换处理
        ipcMain.handle('switch-database', async (event, dbType) => {
            console.log('[IPC] 处理 switch-database 请求');
            try {
                const { switchDatabase, getCurrentDbType } = require('../database/connection');

                // 切换数据库
                switchDatabase(dbType);

                return {
                    success: true,
                    message: `已切换到${dbType === 'production' ? '生产' : '测试'}数据库`,
                    currentDbType: getCurrentDbType()
                };
            } catch (error) {
                console.error('切换数据库时出错:', error);
                return {
                    success: false,
                    message: `切换数据库出错: ${error.message}`
                };
            }
        });
        console.log('[ELECTRON] IPC处理器 switch-database 注册完成');

        console.log('[ELECTRON] 所有IPC处理器注册完成');
    }

    // 应用准备就绪时创建窗口
    app.whenReady().then(() => {
        console.log('[ELECTRON] 应用准备就绪，开始创建窗口...');
        createWindow();

        // 初始化IPC处理器
        console.log('[ELECTRON] 开始初始化IPC处理器...');
        setupIpcHandlers(mainWindow);

        // 导入并初始化功能模块
        try {
            console.log('[ELECTRON] 正在初始化归档处理程序...');
            const { initArchiveHandlers } = require('../main-archive');
            initArchiveHandlers(mainWindow);
            console.log('[ELECTRON] 归档处理程序初始化完成');
        } catch (error) {
            console.error('初始化归档处理程序失败:', error);
        }

        app.on('activate', () => {
            if (BrowserWindow.getAllWindows().length === 0) {
                createWindow();
            }
        });
    });

    // 所有窗口关闭时退出应用（非macOS）
    app.on('window-all-closed', () => {
        if (process.platform !== 'darwin') {
            app.quit();
        }
    });

    // 防止应用退出
    if (process.env.NODE_ENV === 'development') {
        console.log('[ELECTRON] 开发模式启动');
    } else {
        console.log('[ELECTRON] 生产模式启动');
    }
} else {
    // 不在electron环境中，显示提示信息
    console.log('[info] 此脚本需要在electron环境中运行');
    console.log('[info] 请使用 electron 命令或 npm run electron 来启动');
}