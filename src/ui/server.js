const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');
const DataManager = require('../utils/data-manager');

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
  '.otf': 'application/font-otf',
  '.wasm': 'application/wasm'
};

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
  
  if (pathname === '/api/customers') {
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
  } else if (pathname.startsWith('/api/customer/')) {
    // 更新客户状态
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
  } else if (pathname === '/api/config') {
    const configPath = path.join(__dirname, '../../config.json');
    
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
          const configContent = fs.readFileSync(configPath, 'utf8');
          const config = JSON.parse(configContent);
          
          // 更新路径配置
          if (newConfigData.sourcePath !== undefined) {
            config.sourcePath = newConfigData.sourcePath;
          }
          if (newConfigData.localPath !== undefined) {
            config.localPath = newConfigData.localPath;
          }
          if (newConfigData.networkPath !== undefined) {
            config.networkPath = newConfigData.networkPath;
          }
          
          // 保存配置
          fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');
          
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true }));
        } catch (error) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Failed to update config: ' + error.message }));
        }
      });
    }
  } else {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
  }
}

// 服务静态文件
function serveStaticFile(res, filePath) {
  const extname = String(path.extname(filePath)).toLowerCase();
  const contentType = mimeTypes[extname] || 'application/octet-stream';

  fs.readFile(filePath, function(error, content) {
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