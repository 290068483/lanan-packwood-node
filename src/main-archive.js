const { exec } = require('child_process');
const { ipcMain } = require('electron');
const CustomerArchiveManager = require('./utils/customer-archive-manager');
const path = require('path');
const fs = require('fs').promises;
const config = require('../config.json');

// 设置控制台编码为UTF-8，解决乱码问题
if (process.platform === 'win32') {
  exec('chcp 65001', (error, stdout, stderr) => {
    if (error) {
      console.error('设置控制台编码时出错:', error);
    }
  });
}

/**
 * 初始化归档相关IPC处理程序
 * @param {Electron.BrowserWindow} mainWindow - 主窗口实例
 */
function initArchiveHandlers(mainWindow) {
  try {
    // 确保归档数据文件存在
    CustomerArchiveManager.ensureArchiveFiles();
  } catch (error) {
    console.error('初始化归档数据文件失败:', error);
  }
  
  // 移除可能已存在的处理器，避免重复注册
  ipcMain.removeHandler('archive-customer');
  ipcMain.removeHandler('get-archive-list');
  ipcMain.removeHandler('restore-archive');
  ipcMain.removeHandler('get-archive-detail');
  ipcMain.removeHandler('delete-archive');
  ipcMain.removeHandler('export-archive-to-excel');
  ipcMain.removeHandler('export-archive-to-pdf');

  // 归档客户数据
  ipcMain.handle('archive-customer', async (event, customerName, remark = '') => {
    try {
      const result = await CustomerArchiveManager.archiveCustomer(
        customerName, 
        'system', 
        remark
      );
      if (result.success && mainWindow) {
        mainWindow.webContents.send('archive-success', {
          customerName,
          archiveId: result.archiveId,
        });
      }
      return { success: true, ...result };
    } catch (error) {
      console.error('归档客户失败:', error);
      return { success: false, error: error.message };
    }
  });

  // 获取归档列表
  ipcMain.handle('get-archive-list', async (event, page = 1, pageSize = 20) => {
    try {
      const result = await CustomerArchiveManager.getArchiveList(page, pageSize);
      return { success: true, ...result };
    } catch (error) {
      console.error('获取归档列表失败:', error);
      return { success: false, error: error.message };
    }
  });

  // 恢复归档数据
  ipcMain.handle('restore-archive', async (event, archiveId) => {
    try {
      const result = await CustomerArchiveManager.restoreArchive(archiveId);
      return { success: true, ...result };
    } catch (error) {
      console.error('恢复归档数据失败:', error);
      return { success: false, error: error.message };
    }
  });

  // 获取归档详情
  ipcMain.handle('get-archive-detail', async (event, archiveId) => {
    try {
      const result = await CustomerArchiveManager.getArchiveDetail(archiveId);
      return { success: true, ...result };
    } catch (error) {
      console.error('获取归档详情失败:', error);
      return { success: false, error: error.message };
    }
  });

  // 删除归档
  ipcMain.handle('delete-archive', async (event, archiveId) => {
    try {
      const result = await CustomerArchiveManager.deleteArchive(archiveId);
      return { success: true, ...result };
    } catch (error) {
      console.error('删除归档失败:', error);
      return { success: false, error: error.message };
    }
  });

  // 导出归档到Excel
  ipcMain.handle('export-archive-to-excel', async (event, archiveId) => {
    try {
      const result = await CustomerArchiveManager.exportArchiveToExcel(archiveId);
      return { success: true, ...result };
    } catch (error) {
      console.error('导出归档到Excel失败:', error);
      return { success: false, error: error.message };
    }
  });

  // 导出归档到PDF
  ipcMain.handle('export-archive-to-pdf', async (event, archiveId) => {
    try {
      const result = await CustomerArchiveManager.exportArchiveToPDF(archiveId);
      return { success: true, ...result };
    } catch (error) {
      console.error('导出归档到PDF失败:', error);
      return { success: false, error: error.message };
    }
  });
}

module.exports = { initArchiveHandlers };