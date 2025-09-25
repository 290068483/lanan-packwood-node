// 定义自定义组件
class HeaderComponent extends HTMLElement {
  connectedCallback() {
    fetch('./components/header.html')
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.text();
      })
      .then(html => {
        this.innerHTML = html;
      })
      .catch(error => {
        console.error('加载header组件失败:', error);
        this.innerHTML = '<div class="error">加载头部组件失败</div>';
      });
  }
}

class ControlPanelComponent extends HTMLElement {
  connectedCallback() {
    fetch('./components/control-panel.html')
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.text();
      })
      .then(html => {
        this.innerHTML = html;
        this.initializeEventListeners();
      })
      .catch(error => {
        console.error('加载control-panel组件失败:', error);
        this.innerHTML = '<div class="error">加载控制面板组件失败</div>';
      });
  }

  initializeEventListeners() {
    // 这里将添加控制面板的事件监听器
  }
}

class CustomersTableComponent extends HTMLElement {
  connectedCallback() {
    fetch('./components/customers-table.html')
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.text();
      })
      .then(html => {
        this.innerHTML = html;
      })
      .catch(error => {
        console.error('加载customers-table组件失败:', error);
        this.innerHTML = '<div class="error">加载客户表格组件失败</div>';
      });
  }
}

class ShipModalComponent extends HTMLElement {
  connectedCallback() {
    fetch('./components/ship-modal.html')
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.text();
      })
      .then(html => {
        this.innerHTML = html;
      })
      .catch(error => {
        console.error('加载ship-modal组件失败:', error);
        this.innerHTML = '<div class="error">加载出货模态框组件失败</div>';
      });
  }
}

class ConfigModalComponent extends HTMLElement {
  connectedCallback() {
    fetch('./components/config-modal.html')
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.text();
      })
      .then(html => {
        this.innerHTML = html;
      })
      .catch(error => {
        console.error('加载config-modal组件失败:', error);
        this.innerHTML = '<div class="error">加载配置模态框组件失败</div>';
      });
  }
}

// 注册自定义组件
customElements.define('header-component', HeaderComponent);
customElements.define('control-panel-component', ControlPanelComponent);
customElements.define('customers-table-component', CustomersTableComponent);
customElements.define('ship-modal-component', ShipModalComponent);
customElements.define('config-modal-component', ConfigModalComponent);

// 页面加载完成后初始化应用
document.addEventListener('DOMContentLoaded', () => {
  // 初始化应用逻辑
  initializeApp();
});

// 初始化应用函数
function initializeApp() {
  // 这里将添加应用初始化逻辑
  console.log('应用已初始化');

  // 加载客户数据
  loadCustomersData();
}

// 加载客户数据函数
async function loadCustomersData() {
  try {
    console.log('开始加载客户数据...');

    // 通过IPC调用后端获取客户数据
    const customers = await window.electronAPI.getCustomers();

    console.log('获取到的客户数据:', customers);

    // 渲染客户数据到表格
    renderCustomersTable(customers);

  } catch (error) {
    console.error('加载客户数据失败:', error);
    // 显示错误信息
    showErrorMessage('加载客户数据失败: ' + error.message);
  }
}

// 渲染客户表格
function renderCustomersTable(customers) {
  const tableBody = document.querySelector('#customersTable tbody');

  if (!tableBody) {
    console.error('找不到表格body元素');
    return;
  }

  // 清空表格
  tableBody.innerHTML = '';

  if (!customers || customers.length === 0) {
    // 没有数据时显示提示
    const row = document.createElement('tr');
    row.innerHTML = '<td colspan="7" style="text-align: center; padding: 20px;">暂无客户数据</td>';
    tableBody.appendChild(row);
    return;
  }

  // 遍历客户数据并创建表格行
  customers.forEach(customer => {
    const row = document.createElement('tr');

    // 格式化打包进度
    const progressText = customer.packProgress !== undefined ? `${customer.packProgress}%` : '0%';

    // 格式化客户状态
    let customerStatusClass = 'status-not-packed'; // 默认状态
    let customerStatusText = '未打包';
    
    if (customer.status === '已打包') {
      customerStatusClass = 'status-packed';
      customerStatusText = '已打包';
    } else if (customer.status === '已发货') {
      customerStatusClass = 'status-shipped';
      customerStatusText = '已发货';
    } else if (customer.status === '打包中') {
      customerStatusClass = 'status-in-progress';
      customerStatusText = '打包中';
    } else if (customer.status === '已归档') {
      customerStatusClass = 'status-archived';
      customerStatusText = '已归档';
    }

    // 格式化出货状态
    let shipStatusClass = 'status-not-shipped'; // 默认状态
    let shipStatusText = '未发货';
    
    if (customer.status === '已发货') {
      shipStatusClass = 'status-shipped';
      shipStatusText = '已发货';
    } else if (customer.shipStatus === '部分发货') {
      shipStatusClass = 'status-partial-shipped';
      shipStatusText = '部分发货';
    }

    // 格式化时间
    const lastUpdate = customer.lastUpdate ? new Date(customer.lastUpdate).toLocaleString() : '无';

    row.innerHTML = `
      <td>${customer.name || '未知客户'}</td>
      <td><span class="${customerStatusClass} status-text">${customerStatusText}</span></td>
      <td><span class="${shipStatusClass} status-text">${shipStatusText}</span></td>
      <td style="display: none;">${progressText}</td>
      <td>${customer.packSeqs ? customer.packSeqs.join(', ') : '无'}</td>
      <td>
        <button class="btn btn-small" onclick="updateCustomerStatus('${customer.name}')">更新状态</button>
        <button class="btn btn-small btn-danger" onclick="shipCustomer('${customer.name}')">发货</button>
      </td>
      <td>${lastUpdate}</td>
    `;

    tableBody.appendChild(row);
  });
}

// 显示错误信息
function showErrorMessage(message) {
  const tableBody = document.querySelector('#customersTable tbody');
  if (tableBody) {
    tableBody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: red; padding: 20px;">${message}</td></tr>`;
  }
}

// 更新客户状态
async function updateCustomerStatus(customerName) {
  try {
    await window.electronAPI.updateCustomerStatus(customerName, '已打包', '');
    // 重新加载数据
    loadCustomersData();
  } catch (error) {
    console.error('更新客户状态失败:', error);
    alert('更新客户状态失败: ' + error.message);
  }
}

// 发货客户
async function shipCustomer(customerName) {
  try {
    await window.electronAPI.shipCustomer(customerName);
    // 重新加载数据
    loadCustomersData();
  } catch (error) {
    console.error('发货失败:', error);
    alert('发货失败: ' + error.message);
  }
}