// 热更新客户端代码
(function() {
  // 检查是否启用热更新
  const enableHotReload = new URLSearchParams(window.location.search).has('hot');

  if (!enableHotReload) {
    console.log('热更新已禁用，请添加 ?hot 参数启用');
    return;
  }

  // 连接到热更新服务器
  const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsUrl = `${wsProtocol}//${window.location.host}`;
  const socket = new WebSocket(wsUrl);

  // 连接建立
  socket.onopen = () => {
    console.log('已连接到热更新服务器');
  };

  // 接收消息
  socket.onmessage = (event) => {
    try {
      const message = JSON.parse(event.data);

      switch (message.type) {
        case 'connected':
          console.log(message.message);
          break;

        case 'file-changed':
          console.log(`检测到文件变化: ${message.path}`);
          // 显示刷新提示
          const notification = document.createElement('div');
          notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px;
            background-color: #4CAF50;
            color: white;
            border-radius: 5px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.2);
            z-index: 1000;
            cursor: pointer;
          `;
          notification.textContent = '检测到文件变化，点击刷新页面';
          notification.onclick = () => {
            window.location.reload();
          };
          document.body.appendChild(notification);

          // 5秒后自动移除提示
          setTimeout(() => {
            if (notification.parentNode) {
              notification.parentNode.removeChild(notification);
            }
          }, 5000);
          break;
      }
    } catch (error) {
      console.error('处理热更新消息时出错:', error);
    }
  };

  // 连接关闭
  socket.onclose = () => {
    console.log('与热更新服务器的连接已关闭');
  };

  // 连接错误
  socket.onerror = (error) => {
    console.error('热更新连接错误:', error);
  };
})();
