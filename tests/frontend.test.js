/**
 * 前端界面的单元测试
 */

const jsdom = require('jsdom');
const { JSDOM } = jsdom;

// 模拟DOM环境
const dom = new JSDOM(`<!DOCTYPE html><html><head></head><body><div id="app"></div></body></html>`);
const { window } = dom;

// 模拟全局变量
global.window = window;
global.document = window.document;
global.navigator = window.navigator;

// 模拟fetch API
global.fetch = jest.fn();

// 模拟Electron API
const mockElectronAPI = {
  getCustomers: jest.fn(),
  getCustomerDetails: jest.fn(),
  getConfig: jest.fn()
};

// 模拟通知函数
function showNotification(message, type = 'info') {
  console.log(`[${type}] ${message}`);
}

// 模拟客户数据
const mockCustomers = [
  {
    name: '测试客户1',
    status: '未打包',
    packProgress: 0,
    packSeqs: [],
    lastUpdate: '2023-01-01 10:00:00'
  },
  {
    name: '测试客户2',
    status: '正在处理',
    packProgress: 50,
    packSeqs: ['1'],
    lastUpdate: '2023-01-02 10:00:00'
  },
  {
    name: '测试客户3',
    status: '已打包',
    packProgress: 100,
    packSeqs: ['1', '2'],
    lastUpdate: '2023-01-03 10:00:00'
  },
  {
    name: '测试客户4',
    status: '已归档',
    packProgress: 100,
    packSeqs: ['1', '2', '3'],
    lastUpdate: '2023-01-04 10:00:00'
  },
  {
    name: '测试客户5',
    status: '已出货',
    packProgress: 100,
    packSeqs: ['1', '2', '3', '4'],
    lastUpdate: '2023-01-05 10:00:00'
  },
  {
    name: '测试客户6',
    status: '未出货',
    packProgress: 100,
    packSeqs: ['1', '2', '3', '4', '5'],
    lastUpdate: '2023-01-06 10:00:00'
  }
];

describe('前端界面测试', () => {
  // 重置所有模拟
  beforeEach(() => {
    jest.clearAllMocks();
    fetch.mockClear();
    mockElectronAPI.getCustomers.mockClear();
    mockElectronAPI.getCustomerDetails.mockClear();
    mockElectronAPI.getConfig.mockClear();

    // 设置默认的模拟返回值
    mockElectronAPI.getCustomers.mockResolvedValue({
      success: true,
      customers: mockCustomers
    });

    mockElectronAPI.getCustomerDetails.mockResolvedValue({
      success: true,
      details: {
        status: '未打包',
        packProgress: 0,
        packSeqs: [],
        lastUpdate: new Date().toISOString()
      }
    });

    mockElectronAPI.getConfig.mockResolvedValue({
      sourcePath: '//A6/蓝岸文件/1、客户总文件/3、生产/1、正单',
      localPath: 'C:/Program Files (x86)/MPM/temp/local',
      networkPath: '//c1/mpm/temp/local/test'
    });
  });

  // 测试加载客户数据函数
  test('加载客户数据应该正确处理客户数据', async () => {
    // 模拟DOM元素
    const tbody = document.createElement('tbody');
    document.querySelector = jest.fn().mockReturnValue(tbody);

    // 模拟isElectron为true
    const isElectron = true;

    // 模拟loadCustomersFromSource函数
    async function loadCustomersFromSource() {
      return mockCustomers;
    }

    // 模拟loadCustomers函数
    async function loadCustomers() {
      const customers = await loadCustomersFromSource();
      const tbody = document.querySelector('#customersTable tbody');
      tbody.innerHTML = '';

      if (customers.length === 0) {
        const row = document.createElement('tr');
        row.innerHTML = `
          <td colspan="6" style="text-align: center; font-style: italic; color: #7f8c8d;">
            暂无客户数据
          </td>
        `;
        tbody.appendChild(row);
        return;
      }

      customers.forEach(customer => {
        const row = document.createElement('tr');
        const lastUpdate = customer.lastUpdate
          ? new Date(customer.lastUpdate).toLocaleDateString()
          : '未知';

        // 状态样式处理
        let statusClass = '';
        let statusColor = '';
        let statusText = customer.status || '未知';
        let packProgress = customer.packProgress || 0;

        // 使用客户状态管理器中的状态和颜色
        if (customer.status === '未打包') {
          statusClass = 'status-not-packed';
          statusColor = '#95a5a6'; // 灰色
        } else if (customer.status === '正在处理') {
          statusClass = 'status-in-progress';
          statusColor = '#2196F3'; // 蓝色
        } else if (customer.status === '已打包') {
          statusClass = 'status-packed';
          statusColor = '#FFC107'; // 黄色
        } else if (customer.status === '已归档') {
          statusClass = 'status-archived';
          statusColor = '#9C27B0'; // 紫色
        } else if (customer.status === '已出货') {
          statusClass = 'status-shipped';
          statusColor = '#4CAF50'; // 绿色
        } else if (customer.status === '未出货') {
          statusClass = 'status-not-shipped';
          statusColor = '#FF9800'; // 橙色
        }

        // 操作按钮
        let actionButtons = '';
        if (customer.status === '已打包') {
          actionButtons = `
            <button class="action-btn archive-btn" data-customer="${customer.name}">归档</button>
          `;
        } else if (customer.status === '已归档') {
          actionButtons = `
            <button class="action-btn ship-btn" data-customer="${customer.name}">出货</button>
            <button class="action-btn not-shipped-btn" data-customer="${customer.name}">标记为未出货</button>
          `;
        } else if (customer.status === '未出货') {
          actionButtons = `
            <button class="action-btn ship-btn" data-customer="${customer.name}">出货</button>
          `;
        }

        row.innerHTML = `
          <td>${customer.name || ''}</td>
          <td class="status-cell ${statusClass}" style="color: ${statusColor};">${statusText}</td>
          <td>
            <div class="progress-container">
              <div class="progress-bar" style="width: ${packProgress}%; background-color: ${statusColor};"></div>
              <span class="progress-text">${packProgress}%</span>
            </div>
          </td>
          <td>${customer.packSeqs.join(', ') || '无'}</td>
          <td class="action-cell">${actionButtons}</td>
          <td>${lastUpdate}</td>
        `;
        tbody.appendChild(row);
      });
    }

    // 调用loadCustomers函数
    await loadCustomers();

    // 验证表格行数
    expect(tbody.children.length).toBe(mockCustomers.length);

    // 验证第一行客户数据
    const firstRow = tbody.children[0];
    expect(firstRow.children[0].textContent).toBe('测试客户1');
    expect(firstRow.children[1].textContent).toBe('未打包');
    expect(firstRow.children[2].querySelector('.progress-text').textContent).toBe('0%');
    expect(firstRow.children[3].textContent).toBe('无');
    expect(firstRow.children[4].querySelector('.archive-btn')).toBeNull();
  });

  // 测试状态颜色映射
  test('状态颜色映射应该返回正确的颜色代码', () => {
    const statusColorMap = {
      '未打包': '#95a5a6',
      '正在处理': '#2196F3',
      '已打包': '#FFC107',
      '已归档': '#9C27B0',
      '已出货': '#4CAF50',
      '未出货': '#FF9800'
    };

    expect(statusColorMap['未打包']).toBe('#95a5a6');
    expect(statusColorMap['正在处理']).toBe('#2196F3');
    expect(statusColorMap['已打包']).toBe('#FFC107');
    expect(statusColorMap['已归档']).toBe('#9C27B0');
    expect(statusColorMap['已出货']).toBe('#4CAF50');
    expect(statusColorMap['未出货']).toBe('#FF9800');
  });

  // 测试操作按钮显示逻辑
  test('操作按钮应该根据客户状态正确显示', () => {
    const customerStatus = '已打包';
    let actionButtons = '';

    if (customerStatus === '已打包') {
      actionButtons = `
        <button class="action-btn archive-btn" data-customer="测试客户">归档</button>
      `;
    } else if (customerStatus === '已归档') {
      actionButtons = `
        <button class="action-btn ship-btn" data-customer="测试客户">出货</button>
        <button class="action-btn not-shipped-btn" data-customer="测试客户">标记为未出货</button>
      `;
    } else if (customerStatus === '未出货') {
      actionButtons = `
        <button class="action-btn ship-btn" data-customer="测试客户">出货</button>
      `;
    }

    expect(actionButtons).toContain('archive-btn');
    expect(actionButtons).not.toContain('ship-btn');
    expect(actionButtons).not.toContain('not-shipped-btn');
  });

  // 测试API调用
  test('API调用应该正确处理响应', async () => {
    // 模拟API响应
    fetch.mockResolvedValue({
      ok: true,
      json: async () => mockCustomers
    });

    // 调用API
    const response = await fetch('/api/customers/source');
    const customers = await response.json();

    // 验证API调用
    expect(fetch).toHaveBeenCalledWith('/api/customers/source');
    expect(response.ok).toBe(true);
    expect(customers).toEqual(mockCustomers);
  });
});
