
// 按钮事件处理
document.getElementById('viewDataBtn').addEventListener('click', async function () {
  try {
    // 确保获取最新配置
    if (!config || Object.keys(config).length === 0) {
      await loadConfigToModal();
    }

    // 从配置中获取保存路径，使用正确的默认路径
    const workerBackupPath = config.workerPackagesPath || 'D:/backup_data/backup/worker';
    const customerBackupPath = config.customerPackedPath || 'D:/backup_data/backup/customer';

    // 创建一个简单的选择对话框
    const dialog = document.createElement('div');
    dialog.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: white;
      padding: 20px;
      border-radius: 8px;
      box-shadow: 0 4px 8px rgba(0,0,0,0.1);
      z-index: 1000;
      min-width: 300px;
      text-align: center;
    `;

    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0,0,0,0.5);
      z-index: 999;
    `;

    const title = document.createElement('h3');
    title.textContent = '请选择要打开的文件夹';
    dialog.appendChild(title);

    const btn1 = document.createElement('button');
    btn1.textContent = '客户数据文件路径';
    btn1.style.cssText = 'margin: 10px; padding: 8px 16px; background: #3498db; color: white; border: none; border-radius: 4px; cursor: pointer;';
    btn1.onclick = async function() {
      // 在 Electron 环境中打开客户数据文件路径
      if (isElectron) {
        const result = await window.electronAPI.openDirectory(customerBackupPath);
        if (result.success) {
          showNotification('已成功打开文件夹: ' + abbreviatePath(customerBackupPath), 'success');
        } else {
          showNotification('打开文件夹失败: ' + result.error, 'error');
        }
        document.body.removeChild(dialog);
        document.body.removeChild(overlay);
      } else {
        // 发送请求到服务器打开客户数据文件路径
        try {
          const response = await fetch('/open-folder?path=' + encodeURIComponent(customerBackupPath));
          const message = await response.text();

          if (response.ok) {
            showNotification(message);
          } else {
            showNotification('打开文件夹失败: ' + message, 'error');
          }
          document.body.removeChild(dialog);
          document.body.removeChild(overlay);
        } catch (err) {
          showNotification('无法打开文件夹：' + err.message, 'error');
          document.body.removeChild(dialog);
          document.body.removeChild(overlay);
        }
      }
    };
    dialog.appendChild(btn1);

    const btn2 = document.createElement('button');
    btn2.textContent = '工人打包文件路径';
    btn2.style.cssText = 'margin: 10px; padding: 8px 16px; background: #2ecc71; color: white; border: none; border-radius: 4px; cursor: pointer;';
    btn2.onclick = async function() {
      // 在 Electron 环境中打开工人打包文件路径
      if (isElectron) {
        const result = await window.electronAPI.openDirectory(workerBackupPath);
        if (result.success) {
          showNotification('已成功打开文件夹: ' + abbreviatePath(workerBackupPath), 'success');
        } else {
          showNotification('打开文件夹失败: ' + result.error, 'error');
        }
        document.body.removeChild(dialog);
        document.body.removeChild(overlay);
      } else {
        // 发送请求到服务器打开工人打包文件路径
        try {
          const response = await fetch('/open-folder?path=' + encodeURIComponent(workerBackupPath));
          const message = await response.text();

          if (response.ok) {
            showNotification(message);
          } else {
            showNotification('打开文件夹失败: ' + message, 'error');
          }
          document.body.removeChild(dialog);
          document.body.removeChild(overlay);
        } catch (err) {
          showNotification('无法打开文件夹：' + err.message, 'error');
          document.body.removeChild(dialog);
          document.body.removeChild(overlay);
        }
      }
    };
    dialog.appendChild(btn2);

    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = '取消';
    cancelBtn.style.cssText = 'margin: 10px; padding: 8px 16px; background: #e74c3c; color: white; border: none; border-radius: 4px; cursor: pointer;';
    cancelBtn.onclick = function() {
      document.body.removeChild(dialog);
      document.body.removeChild(overlay);
    };
    dialog.appendChild(cancelBtn);

    document.body.appendChild(overlay);
    document.body.appendChild(dialog);
  } catch (error) {
    console.error('打开路径出错:', error);
    showNotification('打开路径出错: ' + error.message, 'error');
  }
});
