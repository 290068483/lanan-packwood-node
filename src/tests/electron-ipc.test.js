const { ipcMain, ipcRenderer } = require('electron');
const { processAllCustomers } = require('../../main');

// 模拟 Electron 模块
jest.mock('electron', () => ({
  app: {
    whenReady: jest.fn().mockResolvedValue(),
    on: jest.fn(),
    quit: jest.fn()
  },
  BrowserWindow: jest.fn().mockImplementation(() => {
    return {
      loadFile: jest.fn(),
      webContents: {
        openDevTools: jest.fn()
      }
    };
  }),
  ipcMain: {
    handle: jest.fn(),
    on: jest.fn()
  },
  dialog: {
    showOpenDialog: jest.fn()
  }
}));

// 模拟配置管理器
jest.mock('../../src/utils/config-manager', () => ({
  getConfig: jest.fn(),
  saveConfig: jest.fn()
}));

// 模拟DataManager
jest.mock('../../src/utils/data-manager', () => ({
  getAllCustomers: jest.fn(),
  updateCustomerStatus: jest.fn(),
  checkConnection: jest.fn(),
  upsertCustomer: jest.fn()
}));

describe('Electron IPC Communication Tests', () => {
  let mockConfigManager;
  let mockDataManager;
  let mockIpcMainHandlers = {};

  beforeEach(() => {
    // 清除模拟调用记录
    jest.clearAllMocks();
    
    // 获取模拟模块
    mockConfigManager = require('../../src/utils/config-manager');
    mockDataManager = require('../../src/utils/data-manager');
    
    // 捕获 IPC 处理程序
    ipcMain.handle.mockImplementation((channel, handler) => {
      mockIpcMainHandlers[channel] = handler;
    });
  });

  test('should register sync-data-source IPC handler', () => {
    // 动态引入 electron-main 以触发 IPC 处理程序注册
    require('../../src/ui/electron-main');
    
    // 验证是否注册了 sync-data-source 处理程序
    expect(ipcMain.handle).toHaveBeenCalledWith('sync-data-source', expect.any(Function));
  });

  test('should handle sync-data-source IPC call successfully', async () => {
    // 动态引入 electron-main 以触发 IPC 处理程序注册
    require('../../src/ui/electron-main');
    
    // 模拟 processAllCustomers 函数
    processAllCustomers.mockResolvedValue({
      successCount: 2,
      totalCustomers: 2
    });
    
    // 获取 sync-data-source 处理程序并调用
    const syncDataSourceHandler = mockIpcMainHandlers['sync-data-source'];
    expect(syncDataSourceHandler).toBeDefined();
    
    const result = await syncDataSourceHandler({}, {});
    
    // 验证结果
    expect(result).toEqual({
      successCount: 2,
      totalCustomers: 2
    });
    
    // 验证调用了 processAllCustomers
    expect(processAllCustomers).toHaveBeenCalledTimes(1);
  });

  test('should handle sync-data-source IPC call with error', async () => {
    // 动态引入 electron-main 以触发 IPC 处理程序注册
    require('../../src/ui/electron-main');
    
    // 模拟 processAllCustomers 函数抛出错误
    processAllCustomers.mockRejectedValue(new Error('同步失败'));
    
    // 获取 sync-data-source 处理程序
    const syncDataSourceHandler = mockIpcMainHandlers['sync-data-source'];
    expect(syncDataSourceHandler).toBeDefined();
    
    // 验证错误被抛出
    await expect(syncDataSourceHandler({}, {})).rejects.toThrow('同步失败');
    
    // 验证调用了 processAllCustomers
    expect(processAllCustomers).toHaveBeenCalledTimes(1);
  });

  test('should register check-database-connection IPC handler', () => {
    // 动态引入 electron-main 以触发 IPC 处理程序注册
    require('../../src/ui/electron-main');
    
    // 验证是否注册了 check-database-connection 处理程序
    expect(ipcMain.handle).toHaveBeenCalledWith('check-database-connection', expect.any(Function));
  });

  test('should handle check-database-connection IPC call successfully', async () => {
    // 动态引入 electron-main 以触发 IPC 处理程序注册
    require('../../src/ui/electron-main');
    
    // 模拟 DataManager.checkConnection 函数
    mockDataManager.checkConnection.mockResolvedValue(true);
    
    // 获取 check-database-connection 处理程序并调用
    const checkConnectionHandler = mockIpcMainHandlers['check-database-connection'];
    expect(checkConnectionHandler).toBeDefined();
    
    const result = await checkConnectionHandler();
    
    // 验证结果
    expect(result).toBe(true);
    
    // 验证调用了 DataManager.checkConnection
    expect(mockDataManager.checkConnection).toHaveBeenCalledTimes(1);
  });
});