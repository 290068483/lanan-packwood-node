

//   // 打开文件资源管理器查看自动保存路径
//   if (isElectron) {
//     ipcRenderer.send('open-folder', config.autoSaveCustomerPath);
//   } else {
//     window.open(config.autoSaveCustomerPath, '_blank');
//   }
// });

// 添加数据库连接状态显示
const dbStatusContainer = document.createElement('div');
dbStatusContainer.id = 'dbStatus';
dbStatusContainer.style.marginTop = '10px';
dbStatusContainer.style.padding = '5px';
dbStatusContainer.style.border = '1px solid #ccc';
dbStatusContainer.style.borderRadius = '4px';
dbStatusContainer.style.display = 'flex';
dbStatusContainer.style.alignItems = 'center';
dbStatusContainer.style.gap = '8px';

const dbStatusIcon = document.createElement('span');
dbStatusIcon.id = 'dbStatusIcon';
dbStatusIcon.style.width = '12px';
dbStatusIcon.style.height = '12px';
dbStatusIcon.style.borderRadius = '50%';
dbStatusIcon.style.backgroundColor = '#ccc';

const dbStatusText = document.createElement('span');
dbStatusText.id = 'dbStatusText';
dbStatusText.textContent = '数据库连接状态: 未知';

dbStatusContainer.appendChild(dbStatusIcon);
dbStatusContainer.appendChild(dbStatusText);

// 将数据库状态容器插入到页面中
document.getElementById('settings-container').appendChild(dbStatusContainer);

// 检查数据库连接状态
async function checkDatabaseConnection() {
  try {
    // 假设 DataManager 提供了检查数据库连接的方法
    const isConnected = await DataManager.checkConnection();
    if (isConnected) {
      dbStatusIcon.style.backgroundColor = '#4CAF50'; // 绿色表示连接成功
      dbStatusText.textContent = '数据库连接状态: 已连接';
    } else {
      dbStatusIcon.style.backgroundColor = '#F44336'; // 红色表示连接失败
      dbStatusText.textContent = '数据库连接状态: 连接失败';
    }
  } catch (error) {
    dbStatusIcon.style.backgroundColor = '#F44336'; // 红色表示连接失败
    dbStatusText.textContent = '数据库连接状态: 连接失败';
    console.error('检查数据库连接时出错:', error);
  }
}

// 在页面加载完成后检查数据库连接状态
window.addEventListener('DOMContentLoaded', () => {
  checkDatabaseConnection();
});
