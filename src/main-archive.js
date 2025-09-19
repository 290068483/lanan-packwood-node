const { ipcMain } = require('electron');
const CustomerArchiveManager = require('./utils/customer-archive-manager');
// 修复config.json路径问题，使用正确的相对路径
const path = require('path');
const fs = require('fs').promises;
const config = require('../config.json');

/**
 * 初始化归档相关IPC处理程序
 * @param {Electron.BrowserWindow} mainWindow - 主窗口实例
 */
function initArchiveHandlers(mainWindow) {
  // 移除可能已存在的处理器，避免重复注册
  ipcMain.removeHandler('archive-customer');
  ipcMain.removeHandler('get-archive-list');
  ipcMain.removeHandler('get-archive-detail');
  ipcMain.removeHandler('restore-archive');
  ipcMain.removeHandler('export-archive-to-excel');
  ipcMain.removeHandler('export-archive-to-pdf');

  // 客户归档相关处理程序
  ipcMain.handle(
    'archive-customer',
    async (event, customerName, operator = 'system', remark = '') => {
      try {
        const result = await CustomerArchiveManager.archiveCustomer(
          customerName,
          operator,
          remark
        );

        if (result.success) {
          // 归档成功后刷新客户列表
          if (mainWindow) {
            mainWindow.webContents.send('archive-success', {
              customerName,
              archiveId: result.archiveId,
            });
          }
        }

        return result;
      } catch (error) {
        console.error('归档客户时出错:', error);
        return { success: false, message: `归档客户失败: ${error.message}` };
      }
    }
  );

  // 获取归档列表
  ipcMain.handle('get-archive-list', async (event, page = 1, pageSize = 20) => {
    try {
      return await CustomerArchiveManager.getArchiveList(page, pageSize);
    } catch (error) {
      console.error('获取归档列表失败:', error);
      return { success: false, message: `获取归档列表失败: ${error.message}` };
    }
  });

  // 获取归档详情
  ipcMain.handle('get-archive-detail', async (event, archiveId) => {
    try {
      return await CustomerArchiveManager.getArchiveDetail(archiveId);
    } catch (error) {
      console.error('获取归档详情失败:', error);
      return { success: false, message: `获取归档详情失败: ${error.message}` };
    }
  });

  // 恢复归档
  ipcMain.handle('restore-archive', async (event, archiveId) => {
    try {
      return await CustomerArchiveManager.restoreArchive(archiveId);
    } catch (error) {
      console.error('恢复归档失败:', error);
      return { success: false, message: `恢复归档失败: ${error.message}` };
    }
  });

  // 导出归档到Excel
  ipcMain.handle('export-archive-to-excel', async (event, archiveId) => {
    try {
      return await CustomerArchiveManager.exportArchiveToExcel(archiveId);
    } catch (error) {
      console.error('导出归档到Excel失败:', error);
      return { success: false, message: `导出归档到Excel失败: ${error.message}` };
    }
  });

  // 导出归档到PDF
  ipcMain.handle('export-archive-to-pdf', async (event, archiveId) => {
    try {
      return await CustomerArchiveManager.exportArchiveToPDF(archiveId);
    } catch (error) {
      console.error('导出归档到PDF失败:', error);
      return { success: false, message: `导出归档到PDF失败: ${error.message}` };
    }
  });
}

module.exports = {
  initArchiveHandlers
};