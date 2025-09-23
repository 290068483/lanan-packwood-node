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

// 检查是否在electron环境中运行
if (process.versions.electron) {
    // 在electron环境中运行
    const { app, BrowserWindow, ipcMain } = require('electron');

    // 设置用户数据路径以解决缓存权限问题
    app.setPath('userData', path.join(app.getPath('appData'), 'PackNode'));

    // 禁用安全警告
    process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = 'true';

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

    // 应用准备就绪时创建窗口
    app.whenReady().then(() => {
        createWindow();

        // 导入并初始化功能模块
        try {
            const { initArchiveHandlers } = require('../main-archive');
            initArchiveHandlers(mainWindow);
        } catch (error) {
            console.error('初始化归档处理程序失败:', error);
        }

        // 导入并初始化IPC处理器
        try {
            const { setupIpcHandlers } = require('../ui/electron-main');
            if (setupIpcHandlers && typeof setupIpcHandlers === 'function') {
                setupIpcHandlers(mainWindow);
                console.log('[ELECTRON] IPC处理器初始化完成');
            } else {
                console.log('[ELECTRON] IPC处理器已在模块加载时自动注册');
            }
        } catch (error) {
            console.error('初始化IPC处理器失败:', error);
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

    // 导入electron主进程文件以保持兼容性
    try {
        require('../ui/electron-main');
    } catch (error) {
        console.error('导入electron-main失败:', error.message);
    }
}