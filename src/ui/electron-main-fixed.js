const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const { exec } = require('child_process');
const DataManager = require('../utils/data-manager');
const fs = require('fs');
const { processAllCustomers } = require('../main');

// 禁用安全警告
process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = 'true';

let mainWindow;
let isProcessing = false;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false, // 禁用 nodeIntegration 提高安全性
      contextIsolation: true, // 启用上下文隔离
      preload: path.join(__dirname, 'electron-preload.js'), // 指定预加载脚本
    }
  });

  // 加载界面文件
  const startUrl = process.env.ELECTRON_START_URL || `file://${path.resolve(__dirname, 'index.html')}`;
  mainWindow.loadURL(startUrl);

  // 在开发模式下打开开发者工具
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', function () {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  try {
    createWindow();

    app.on('activate', function () {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  } catch (error) {
    console.error('创建窗口失败:', error);
    process.exit(1);
  }
}).catch(error => {
  console.error('应用启动失败:', error);
  process.exit(1);
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});

// 全局未捕获异常处理
process.on('uncaughtException', (error) => {
  console.error('未捕获的异常:', error);
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('uncaught-error', {
      message: error.message,
      stack: error.stack
    });
  }
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('未处理的Promise拒绝:', reason, promise);
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('unhandled-rejection', {
      reason: reason.toString(),
      promise: promise.toString()
    });
  }
});

// IPC 处理程序
ipcMain.handle('get-customers', async () => {
  try {
    return await DataManager.getAllCustomers();
  } catch (error) {
    console.error('获取客户数据失败:', error);
    throw new Error(`获取客户数据失败: ${error.message}`);
  }
});

ipcMain.handle('add-customer', async (event, customer) => {
  try {
    await DataManager.upsertCustomer(customer);
    return { success: true };
  } catch (error) {
    console.error('添加客户数据失败:', error);
    return { success: false, error: `添加客户数据失败: ${error.message}` };
  }
});

ipcMain.handle('update-customer-status', async (event, name, status, remark) => {
  try {
    await DataManager.updateCustomerStatus(name, status, remark);
    return { success: true };
  } catch (error) {
    console.error('更新客户状态失败:', error);
    return { success: false, error: `更新客户状态失败: ${error.message}` };
  }
});

// 配置相关处理程序
ipcMain.handle('get-config', async () => {
  try {
    const configPath = path.join(__dirname, '../../config.json');
    if (fs.existsSync(configPath)) {
      const configContent = fs.readFileSync(configPath, 'utf8');
      const config = JSON.parse(configContent);
      // 确保配置包含自动保存路径属性
      if (!config.autoSavePath) {
        config.autoSavePath = path.join(app.getPath('documents'), 'PackNodeAutoSaves');
      }
      return config;
    }
    // 返回默认配置，包含自动保存路径
    return {
      autoSavePath: path.join(app.getPath('documents'), 'PackNodeAutoSaves')
    };
  } catch (error) {
    console.error('读取配置文件失败:', error);
    return { error: error.message };
  }
});

ipcMain.handle('save-config', async (event, config) => {
  try {
    // 导入增量更新配置功能
    const { saveConfigWithMerge } = require('../utils/config-manager');

    // 使用增量更新功能保存配置
    const result = await saveConfigWithMerge(config);

    if (result.success) {
      console.log('✅ 配置保存成功（增量更新）');
      return result;
    } else {
      console.error('✗ 配置保存失败:', result.error);
      return result;
    }
  } catch (error) {
    console.error('✗ 保存配置时出错:', error);
    return { success: false, error: `保存配置时出错: ${error.message}` };
  }
});

// 文件/目录操作处理程序
ipcMain.handle('select-directory', async (event, title) => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: title || '选择目录',
    properties: ['openDirectory']
  });

  if (!result.canceled && result.filePaths.length > 0) {
    return result.filePaths[0];
  }
  return null;
});

ipcMain.handle('open-directory', async (event, dirPath) => {
  return new Promise((resolve) => {
    // 检查路径是否存在，如果不存在则创建
    try {
      // 检查目录是否存在
      if (!fs.existsSync(dirPath)) {
        console.log(`目录不存在，尝试创建: ${dirPath}`);

        // 创建目录（包括所有必要的父目录）
        fs.mkdirSync(dirPath, { recursive: true });
        console.log(`✅ 已创建目录: ${dirPath}`);
      }

      // 在 Windows 上打开目录
      exec(`start "" "${dirPath}"`, (error) => {
        if (error) {
          console.error('打开目录失败:', error);
          return resolve({ success: false, error: error.message });
        }
        console.log(`✅ 已打开目录: ${dirPath}`);
        resolve({ success: true });
      });
    } catch (error) {
      console.error('处理目录时出错:', error);
      resolve({ success: false, error: error.message });
    }
  });
});

// 处理控制相关处理程序
ipcMain.handle('start-processing', async () => {
  try {
    if (isProcessing) {
      return { success: false, message: '处理已在进行中' };
    }

    isProcessing = true;
    if (mainWindow) {
      mainWindow.webContents.send('processing-status', { status: 'started' });
    }

    // 调用主程序的处理函数
    const result = await processAllCustomers();

    isProcessing = false;
    if (mainWindow) {
      mainWindow.webContents.send('processing-status', { status: 'completed', result });
    }

    return { success: true, message: '处理完成', result };
  } catch (error) {
    console.error('启动处理失败:', error);
    isProcessing = false;
    if (mainWindow) {
      mainWindow.webContents.send('processing-status', { status: 'error', error: error.message });
    }
    return { success: false, error: `启动处理失败: ${error.message}` };
  }
});

ipcMain.handle('stop-processing', async () => {
  try {
    // 这里应该实现停止处理逻辑
    isProcessing = false;
    if (mainWindow) {
      mainWindow.webContents.send('processing-status', { status: 'stopped' });
    }
    return { success: true, message: '停止处理' };
  } catch (error) {
    console.error('停止处理失败:', error);
    return { success: false, error: `停止处理失败: ${error.message}` };
  }
});

// 自动保存相关处理程序
ipcMain.handle('start-auto-save-customer', async (event, customerName) => {
  try {
    // 导入自动保存管理器
    const AutoSaveManager = require('../utils/auto-save-manager');

    // 创建自动保存管理器实例
    const autoSaveManager = new AutoSaveManager(config);

    // 启动客户数据自动保存
    autoSaveManager.startAutoSave(customerName);

    console.log(`✅ 已启动客户数据自动保存: ${customerName}`);
    return { success: true, message: `已启动客户数据自动保存: ${customerName}` };
  } catch (error) {
    console.error('启动客户数据自动保存失败:', error);
    return { success: false, error: `启动客户数据自动保存失败: ${error.message}` };
  }
});

ipcMain.handle('start-auto-save-worker', async (event, customerName) => {
  try {
    // 导入自动保存管理器
    const AutoSaveManager = require('../utils/auto-save-manager');

    // 创建自动保存管理器实例
    const autoSaveManager = new AutoSaveManager(config);

    // 启动工人数据自动保存
    autoSaveManager.startAutoSave(customerName);

    console.log(`✅ 已启动工人数据自动保存: ${customerName}`);
    return { success: true, message: `已启动工人数据自动保存: ${customerName}` };
  } catch (error) {
    console.error('启动工人数据自动保存失败:', error);
    return { success: false, error: `启动工人数据自动保存失败: ${error.message}` };
  }
});

ipcMain.handle('view-auto-save-data', async (event, customerName, dataType) => {
  try {
    // 导入自动保存管理器
    const AutoSaveManager = require('../utils/auto-save-manager');

    // 创建自动保存管理器实例
    const autoSaveManager = new AutoSaveManager(config);

    // 根据数据类型确定基础路径
    let basePath;
    if (dataType === 'worker') {
      basePath = config.autoSaveWorkerPath;
    } else {
      basePath = config.autoSaveCustomerPath;
    }

    // 查看自动保存数据
    const result = await autoSaveManager.viewAutoSaveData(basePath, customerName);

    if (result.success) {
      console.log(`✅ 已打开自动保存数据目录: ${result.path}`);
      return result;
    } else {
      console.error('查看自动保存数据失败:', result.error);
      return result;
    }
  } catch (error) {
    console.error('查看自动保存数据失败:', error);
    return { success: false, error: `查看自动保存数据失败: ${error.message}` };
  }
});