const fs = require('fs');
const path = require('path');
const url = require('url');
const http = require('http'); // 移到最前面
const { exec } = require('child_process'); // 添加child_process模块导入
const DataManager = require('../utils/data-manager');
const { processAllCustomers } = require('../main');

// MIME 类型映射
const mimeTypes = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.wav': 'audio/wav',
  '.mp4': 'video/mp4',
  '.woff': 'application/font-woff',
  '.ttf': 'application/font-ttf',
  '.eot': 'application/vnd.ms-fontobject',
  '.otf': 'application/font-of',
  '.wasm': 'application/wasm'
};

// 在server定义之前添加打开文件夹的函数
function openFolderInWindows(folderPath, callback) {
  // 确保路径存在
  fs.stat(folderPath, (err, stats) => {
    if (err || !stats.isDirectory()) {
      callback(err || new Error('指定的路径不存在或不是一个文件夹'));
      return;
    }

    // 在Windows上使用PowerShell命令打开文件夹
    const command = `powershell.exe -Command "Invoke-Item \"${folderPath}\""`;
    exec(command, (error) => {
      if (error) {
        callback(error);
        return;
      }
      callback(null);
    });
  });
}

let isRunning = false;

const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  let pathname = parsedUrl.pathname;

  // 默认页面
  if (pathname === '/') {
    pathname = '/index.html';
  }

  // 构建文件路径
  const filePath = path.join(__dirname, pathname);

  // API 路由
  if (pathname.startsWith('/api/')) {
    handleApiRequest(req, res, parsedUrl);
    return;
  }

  // 静态文件服务
  serveStaticFile(res, filePath);
});

// 处理 API 请求
function handleApiRequest(req, res, parsedUrl) {
  const pathname = parsedUrl.pathname;

  // 配置文件路径
  const configPath = path.join(__dirname, '../../config.json');

  // 处理配置请求
  if (pathname === '/api/config') {
    if (req.method === 'GET') {
      // 获取配置
      try {
        if (fs.existsSync(configPath)) {
          const configContent = fs.readFileSync(configPath, 'utf8');
          const config = JSON.parse(configContent);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(config));
        } else {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Config file not found' }));
        }
      } catch (error) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Failed to read config: ' + error.message }));
      }
    } else if (req.method === 'POST') {
      // 更新配置
      let body = '';
      req.on('data', chunk => {
        body += chunk.toString();
      });
      req.on('end', () => {
        try {
          const newConfigData = JSON.parse(body);

          // 读取现有配置
          let existingConfig = {};
          if (fs.existsSync(configPath)) {
            const existingConfigContent = fs.readFileSync(configPath, 'utf8');
            existingConfig = JSON.parse(existingConfigContent);
          }
          
          // 合并配置，保留未更改的字段
          const updatedConfig = { ...existingConfig, ...JSON.parse(body) };
          
          // 保存配置
          fs.writeFileSync(configPath, JSON.stringify(updatedConfig, null, 2), 'utf8');

          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, message: '配置已更新' }));
        } catch (error) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Failed to update config: ' + error.message }));
        }
      });
    }
  }
  // 处理客户请求
  else if (pathname === '/api/customers') {
    if (req.method === 'GET') {
      // 获取所有客户
      const customers = DataManager.getAllCustomers();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(customers));
    } else if (req.method === 'POST') {
      // 添加客户
      let body = '';
      req.on('data', chunk => {
        body += chunk.toString();
      });
      req.on('end', () => {
        try {
          const customer = JSON.parse(body);
          DataManager.upsertCustomer(customer);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true }));
        } catch (error) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Invalid JSON' }));
        }
      });
    }
  }
  // 更新客户状态
  else if (pathname.startsWith('/api/customer/')) {
    if (req.method === 'PUT') {
      const customerName = decodeURIComponent(pathname.split('/')[3]);
      let body = '';
      req.on('data', chunk => {
        body += chunk.toString();
      });
      req.on('end', () => {
        try {
          const { status, remark } = JSON.parse(body);
          DataManager.updateCustomerStatus(customerName, status, remark);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true }));
        } catch (error) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Invalid JSON' }));
        }
      });
    }
  }
  // 运行主程序
  else if (pathname === '/api/run') {
    if (req.method === 'POST') {
      // 运行主程序
      if (isRunning) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: '程序已在运行中' }));
        return;
      }

      isRunning = true;

      // 异步执行主程序
      setImmediate(async () => {
        try {
          await processAllCustomers();
        } catch (error) {
          console.error('运行主程序出错:', error);
        } finally {
          isRunning = false;
        }
      });

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, message: '程序开始运行' }));
    }
  }
  // 停止运行
  else if (pathname === '/api/stop') {
    if (req.method === 'POST') {
      // 停止运行
      isRunning = false;
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, message: '程序已停止' }));
    }
  }
  // 获取运行状态
  else if (pathname === '/api/status') {
    if (req.method === 'GET') {
      // 获取运行状态
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ running: isRunning }));
    }
  }
  // 打开文件夹
  else if (pathname === '/open-folder') {
    if (req.method === 'GET') {
      const folderPath = parsedUrl.query.path;
      if (!folderPath) {
        res.writeHead(400, { 'Content-Type': 'text/plain' });
        res.end('请提供有效的文件夹路径');
        return;
      }
      
      openFolderInWindows(folderPath, (err) => {
        if (err) {
          res.writeHead(500, { 'Content-Type': 'text/plain' });
          res.end('打开文件夹失败: ' + err.message);
        } else {
          res.writeHead(200, { 'Content-Type': 'text/plain' });
          res.end('已成功打开文件夹: ' + folderPath);
        }
      });
    }
  }
  // 未找到的API
  else {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
  }
}

// 服务静态文件
function serveStaticFile(res, filePath) {
  const extname = String(path.extname(filePath)).toLowerCase();
  const contentType = mimeTypes[extname] || 'application/octet-stream';

  fs.readFile(filePath, function (error, content) {
    if (error) {
      if (error.code == 'ENOENT') {
        res.writeHead(404);
        res.end('404 文件未找到');
      } else {
        res.writeHead(500);
        res.end('服务器内部错误: ' + error.code + ' ..\n');
      }
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content, 'utf-8');
    }
  });
}

// 启动服务器
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`服务器运行在端口 ${PORT}`);
  console.log(`访问地址: http://localhost:${PORT}`);
});

module.exports = server;