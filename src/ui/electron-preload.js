// Electron preload script
// 在渲染进程和主进程之间建立安全通信桥梁

const { contextBridge, ipcRenderer } = require('electron');

// 暴露安全的 API 给渲染进程
contextBridge.exposeInMainWorld('electronAPI', {
  // 客户数据相关
  getCustomers: () => ipcRenderer.invoke('get-customers'),
  addCustomer: (customer) => ipcRenderer.invoke('add-customer', customer),
  updateCustomerStatus: (name, status, remark) => ipcRenderer.invoke('update-customer-status', name, status, remark),
  
  // 配置相关
  getConfig: () => ipcRenderer.invoke('get-config'),
  saveConfig: (config) => ipcRenderer.invoke('save-config', config),
  
  // 文件/目录操作相关
  selectDirectory: (title) => ipcRenderer.invoke('select-directory', title),
  openDirectory: (dirPath) => ipcRenderer.invoke('open-directory', dirPath),
  
  // 处理控制相关
  startProcessing: () => ipcRenderer.invoke('start-processing'),
  stopProcessing: () => ipcRenderer.invoke('stop-processing'),
  
  // 自动保存相关
  startAutoSaveCustomer: () => ipcRenderer.invoke('start-auto-save-customer'),
  startAutoSaveWorker: () => ipcRenderer.invoke('start-auto-save-worker'),
  viewAutoSaveData: () => ipcRenderer.invoke('view-auto-save-data'),
  
  // 监听主进程发送的事件
  onProcessingStatus: (callback) => ipcRenderer.on('processing-status', (event, data) => callback(data)),
  onUncaughtError: (callback) => ipcRenderer.on('uncaught-error', (event, data) => callback(data)),
  onUnhandledRejection: (callback) => ipcRenderer.on('unhandled-rejection', (event, data) => callback(data))
});

// 添加 DOM 加载完成事件监听
document.addEventListener('DOMContentLoaded', () => {
  console.log('Electron preload script loaded');
});