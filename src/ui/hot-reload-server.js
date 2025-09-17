const fs = require('fs');
const path = require('path');
const http = require('http');
const WebSocket = require('ws');
const chokidar = require('chokidar');

// 配置
const PORT = process.env.PORT || 3001;
const WATCH_DIRS = [
  path.join(__dirname, 'index.html'),
  path.join(__dirname, 'main-ui.js')
];

// 创建HTTP服务器
const server = http.createServer((req, res) => {
  // 简单的静态文件服务
  const filePath = path.join(__dirname, req.url === '/' ? 'index.html' : req.url);

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end('File not found');
      return;
    }

    // 设置适当的Content-Type
    const ext = path.extname(filePath);
    let contentType = 'text/html';
    if (ext === '.js') contentType = 'application/javascript';
    else if (ext === '.css') contentType = 'text/css';

    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  });
});

// 创建WebSocket服务器
const wss = new WebSocket.Server({ server });

// WebSocket连接处理
wss.on('connection', (ws) => {
  console.log('客户端已连接');

  // 发送初始消息
  ws.send(JSON.stringify({
    type: 'connected',
    message: '热更新服务已连接'
  }));

  // 连接关闭处理
  ws.on('close', () => {
    console.log('客户端已断开连接');
  });
});

// 创建文件监视器
const watcher = chokidar.watch(WATCH_DIRS, {
  ignored: /\node_modules/,
  persistent: true
});

// 文件变化处理
watcher.on('change', filePath => {
  console.log(`文件已更改: ${filePath}`);

  // 广播文件变化消息给所有连接的客户端
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({
        type: 'file-changed',
        path: filePath,
        timestamp: new Date().toISOString()
      }));
    }
  });
});

// 错误处理
watcher.on('error', error => {
  console.error('文件监视错误:', error);
});

// 启动服务器
server.listen(PORT, () => {
  console.log(`热更新服务器运行在端口 ${PORT}`);
  console.log(`访问地址: http://localhost:${PORT}`);
  console.log(`监视的文件: ${WATCH_DIRS.join(', ')}`);
});
