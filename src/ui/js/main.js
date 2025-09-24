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
}