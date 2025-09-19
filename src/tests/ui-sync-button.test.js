/**
 * UI界面同步按钮功能测试
 */

// 模拟 Electron API
const mockElectronAPI = {
  syncDataSource: jest.fn(),
  checkDatabaseConnection: jest.fn(),
  getCustomers: jest.fn(),
  updateCustomerStatus: jest.fn(),
  getConfig: jest.fn(),
  saveConfig: jest.fn(),
  selectDirectory: jest.fn()
};

// 模拟 DOM
document.body.innerHTML = `
  <div class="control-panel">
    <div class="button-group">
      <button id="syncDataBtn">同步数据源到数据库</button>
      <button id="refreshBtn">刷新数据</button>
      <button id="configBtn" class="config-button">打开路径配置</button>
      <div id="syncStatus" class="sync-status">
        <span class="sync-status-indicator sync-status-idle"></span>
        <span>同步: 空闲</span>
      </div>
      <div id="dbStatus" class="db-status">
        <span class="db-status-indicator db-status-disconnected"></span>
        <span>数据库: 未连接</span>
      </div>
    </div>
  </div>
  
  <div class="notification" id="notification"></div>
`;

// 模拟 window.electronAPI
Object.defineProperty(window, 'electronAPI', {
  value: mockElectronAPI,
  writable: false
});

describe('UI Sync Button Tests', () => {
  let originalDocumentAddEventListener;
  let notificationTimeout;

  beforeEach(() => {
    // 清除模拟调用记录
    jest.clearAllMocks();
    
    // 模拟 setTimeout 以便测试
    jest.useFakeTimers();
    
    // 保存原始的 addEventListener 方法
    originalDocumentAddEventListener = document.addEventListener;
  });

  afterEach(() => {
    // 恢复原始的 addEventListener 方法
    document.addEventListener = originalDocumentAddEventListener;
    
    // 清除模拟的 setTimeout
    jest.useRealTimers();
    
    // 清除通知
    if (notificationTimeout) {
      clearTimeout(notificationTimeout);
    }
  });

  test('should call syncDataSource when sync button is clicked', async () => {
    // 模拟 DOMContentLoaded 事件
    document.addEventListener = jest.fn((event, callback) => {
      if (event === 'DOMContentLoaded') {
        callback();
      }
    });
    
    // 模拟 electronAPI 方法
    mockElectronAPI.syncDataSource.mockResolvedValue({ successCount: 2, totalCustomers: 2 });
    mockElectronAPI.getCustomers.mockResolvedValue([]);
    
    // 引入 UI 脚本
    require('../../src/ui/index.html');
    
    // 获取同步按钮
    const syncButton = document.getElementById('syncDataBtn');
    expect(syncButton).not.toBeNull();
    
    // 触发点击事件
    syncButton.click();
    
    // 等待异步操作完成
    await Promise.resolve();
    
    // 验证调用了 syncDataSource
    expect(mockElectronAPI.syncDataSource).toHaveBeenCalledTimes(1);
  });

  test('should update sync status during synchronization', async () => {
    // 模拟 DOMContentLoaded 事件
    document.addEventListener = jest.fn((event, callback) => {
      if (event === 'DOMContentLoaded') {
        callback();
      }
    });
    
    // 模拟同步过程
    mockElectronAPI.syncDataSource.mockImplementation(() => {
      return new Promise(resolve => {
        setTimeout(() => {
          resolve({ successCount: 2, totalCustomers: 2 });
        }, 100);
      });
    });
    
    mockElectronAPI.getCustomers.mockResolvedValue([]);
    
    // 引入 UI 脚本
    require('../../src/ui/index.html');
    
    // 获取同步按钮和状态元素
    const syncButton = document.getElementById('syncDataBtn');
    const syncStatusIndicator = document.querySelector('#syncStatus .sync-status-indicator');
    const syncStatusText = document.querySelector('#syncStatus span:last-child');
    
    // 初始状态检查
    expect(syncStatusIndicator.classList.contains('sync-status-idle')).toBe(true);
    expect(syncStatusText.textContent).toBe('同步: 空闲');
    
    // 触发点击事件
    syncButton.click();
    
    // 检查同步中状态
    expect(syncStatusIndicator.classList.contains('sync-status-syncing')).toBe(true);
    expect(syncStatusText.textContent).toBe('同步: 正在同步...');
    
    // 快进时间
    jest.advanceTimersByTime(100);
    
    // 等待异步操作完成
    await Promise.resolve();
    
    // 快进更多时间以触发状态恢复
    jest.advanceTimersByTime(3000);
    
    // 检查最终状态（应该恢复为空闲）
    expect(syncStatusIndicator.classList.contains('sync-status-idle')).toBe(true);
    expect(syncStatusText.textContent).toBe('同步: 空闲');
  });

  test('should show notification on sync success', async () => {
    // 模拟 DOMContentLoaded 事件
    document.addEventListener = jest.fn((event, callback) => {
      if (event === 'DOMContentLoaded') {
        callback();
      }
    });
    
    // 模拟同步成功
    mockElectronAPI.syncDataSource.mockResolvedValue({ successCount: 2, totalCustomers: 2 });
    mockElectronAPI.getCustomers.mockResolvedValue([]);
    
    // 引入 UI 脚本
    require('../../src/ui/index.html');
    
    // 获取通知元素和同步按钮
    const notification = document.getElementById('notification');
    const syncButton = document.getElementById('syncDataBtn');
    
    // 初始状态检查
    expect(notification.style.display).toBe('');
    
    // 触发点击事件
    syncButton.click();
    
    // 等待异步操作完成
    await Promise.resolve();
    
    // 检查通知是否显示
    expect(notification.style.display).toBe('block');
    expect(notification.textContent).toBe('数据同步成功');
    expect(notification.style.backgroundColor).toBe('rgb(39, 174, 96)'); // #27ae60
  });

  test('should show notification on sync error', async () => {
    // 模拟 DOMContentLoaded 事件
    document.addEventListener = jest.fn((event, callback) => {
      if (event === 'DOMContentLoaded') {
        callback();
      }
    });
    
    // 模拟同步失败
    mockElectronAPI.syncDataSource.mockRejectedValue(new Error('同步失败'));
    mockElectronAPI.getCustomers.mockResolvedValue([]);
    
    // 引入 UI 脚本
    require('../../src/ui/index.html');
    
    // 获取通知元素和同步按钮
    const notification = document.getElementById('notification');
    const syncButton = document.getElementById('syncDataBtn');
    
    // 初始状态检查
    expect(notification.style.display).toBe('');
    
    // 触发点击事件
    syncButton.click();
    
    // 等待异步操作完成
    await Promise.resolve();
    
    // 检查错误通知是否显示
    expect(notification.style.display).toBe('block');
    expect(notification.textContent).toBe('数据同步失败: 同步失败');
    expect(notification.style.backgroundColor).toBe('rgb(231, 76, 60)'); // #e74c3c
  });

  test('should update sync status on error', async () => {
    // 模拟 DOMContentLoaded 事件
    document.addEventListener = jest.fn((event, callback) => {
      if (event === 'DOMContentLoaded') {
        callback();
      }
    });
    
    // 模拟同步失败
    mockElectronAPI.syncDataSource.mockRejectedValue(new Error('同步失败'));
    mockElectronAPI.getCustomers.mockResolvedValue([]);
    
    // 引入 UI 脚本
    require('../../src/ui/index.html');
    
    // 获取状态元素
    const syncStatusIndicator = document.querySelector('#syncStatus .sync-status-indicator');
    const syncStatusText = document.querySelector('#syncStatus span:last-child');
    
    // 触发同步
    const syncButton = document.getElementById('syncDataBtn');
    syncButton.click();
    
    // 等待异步操作完成
    await Promise.resolve();
    
    // 检查错误状态
    expect(syncStatusIndicator.classList.contains('sync-status-error')).toBe(true);
    expect(syncStatusText.textContent).toBe('同步: 错误');
  });
});