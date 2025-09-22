// Electron preload script
// 在渲染进程和主进程之间建立安全通信桥梁

const { contextBridge, ipcRenderer } = require('electron');

// 安全地暴露 API 给渲染进程
contextBridge.exposeInMainWorld('electronAPI', {
  // 客户数据相关
  getCustomers: () => ipcRenderer.invoke('get-customers'),
  getCustomerDetails: (customerName) => ipcRenderer.invoke('get-customer-details', customerName),
  addCustomer: (customer) => ipcRenderer.invoke('add-customer', customer),
  updateCustomerStatus: (name, status, remark) => ipcRenderer.invoke('update-customer-status', name, status, remark),

  // 配置相关
  getConfig: () => ipcRenderer.invoke('get-config'),
  saveConfig: (config) => ipcRenderer.invoke('save-config', config),

  // 数据库相关
  checkDatabaseConnection: () => ipcRenderer.invoke('check-database-connection'),
  switchDatabase: (dbType) => ipcRenderer.invoke('switch-database', dbType),
  getCurrentDbType: () => ipcRenderer.invoke('get-current-database-type'),

  // 文件/目录操作相关
  selectDirectory: (title) => ipcRenderer.invoke('select-directory', title),
  openDirectory: (dirPath) => ipcRenderer.invoke('open-directory', dirPath),

  // 数据同步相关
  syncDataSource: () => ipcRenderer.invoke('sync-data-source'),
  openCustomerExcelFile: (customerName) => ipcRenderer.invoke('open-customer-excel-file', customerName),

  // 处理控制相关
  startProcessing: () => ipcRenderer.invoke('start-processing'),
  stopProcessing: () => ipcRenderer.invoke('stop-processing'),

  // 客户状态管理相关
  archiveCustomer: (customerName) => ipcRenderer.invoke('archive-customer', customerName),
  shipCustomer: (customerName) => ipcRenderer.invoke('ship-customer', customerName),
  partialShipCustomer: (customerName) => ipcRenderer.invoke('partial-ship-customer', customerName),
  markCustomerNotShipped: (customerName) => ipcRenderer.invoke('mark-customer-not-shipped', customerName),
  checkCustomerStatus: (customerName) => ipcRenderer.invoke('check-customer-status', customerName),
  getHistoryRecords: (limit = 10) => ipcRenderer.invoke('get-history-records', limit),

  // 归档相关
  getArchiveList: (page = 1, pageSize = 20) => ipcRenderer.invoke('get-archive-list', page, pageSize),
  getArchiveDetail: (archiveId) => ipcRenderer.invoke('get-archive-detail', archiveId),
  restoreArchive: (archiveId) => ipcRenderer.invoke('restore-archive', archiveId),
  exportArchiveToExcel: (archiveId) => ipcRenderer.invoke('export-archive-to-excel', archiveId),
  exportArchiveToPDF: (archiveId) => ipcRenderer.invoke('export-archive-to-pdf', archiveId),

  // 应用程序控制相关
  restartApplication: () => ipcRenderer.invoke('restart-application'),

  // 自动保存相关
  startAutoSaveCustomer: () => ipcRenderer.invoke('start-auto-save-customer'),
  startAutoSaveWorker: () => ipcRenderer.invoke('start-auto-save-worker'),
  viewAutoSaveData: () => ipcRenderer.invoke('view-auto-save-data'),

  // 监听主进程发送的事件
  onUpdateProcessing: (callback) => ipcRenderer.on('update-processing', (_event, value) => callback(value)),
  onUpdateProgress: (callback) => ipcRenderer.on('update-progress', (_event, value) => callback(value)),
  onUpdateCustomerStatus: (callback) => ipcRenderer.on('update-customer-status', (_event, customerName, status, progress) => callback(customerName, status, progress)),
  onProcessingComplete: (callback) => ipcRenderer.on('processing-complete', (_event, result) => callback(result)),
  onProcessingError: (callback) => ipcRenderer.on('processing-error', (_event, error) => callback(error)),
  onProcessingStatus: (callback) => ipcRenderer.on('processing-status', (event, data) => callback(data)),
  onUncaughtError: (callback) => ipcRenderer.on('uncaught-error', (event, data) => callback(data)),
  onUnhandledRejection: (callback) => ipcRenderer.on('unhandled-rejection', (event, data) => callback(data)),
  removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel)
});

// 添加 DOM 加载完成事件监听
document.addEventListener('DOMContentLoaded', () => {
  console.log('Electron preload script loaded');
});