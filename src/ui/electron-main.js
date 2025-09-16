const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const DataManager = require('../utils/data-manager');

// 禁用安全警告
process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = 'true';

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true,
    }
  });

  // 加载界面文件
  mainWindow.loadFile('src/ui/index.html');

  // 打开开发者工具
  // mainWindow.webContents.openDevTools();

  mainWindow.on('closed', function () {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});

// IPC 处理程序
ipcMain.handle('get-customers', async () => {
  return DataManager.getAllCustomers();
});

ipcMain.handle('add-customer', async (event, customer) => {
  DataManager.upsertCustomer(customer);
  return { success: true };
});

ipcMain.handle('update-customer-status', async (event, name, status, remark) => {
  DataManager.updateCustomerStatus(name, status, remark);
  return { success: true };
});