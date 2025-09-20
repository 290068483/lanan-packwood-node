/**
 * 主服务
 * 负责监控packages.json文件变化并更新客户状态
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');
const { exec } = require('child_process');

// 设置控制台编码为UTF-8，解决乱码问题
if (process.platform === 'win32') {
  exec('chcp 65001', (error, stdout, stderr) => {
    if (error) {
      console.error('设置控制台编码时出错:', error);
    }
  });
}

const configPath = path.join(__dirname, '../../config.json');
const CustomerStatusManager = require('../utils/customer-status-manager');
const { CustomerStatus } = require('../utils/status-manager');
const {
  getAllCustomersAPI,
  getCustomerAPI,
  updateCustomerStatusAPI,
  getCustomersByStatusAPI
} = require('../database/api');

// 读取配置文件
let config = {};
if (fs.existsSync(configPath)) {
  config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
} else {
  console.error('配置文件不存在:', configPath);
  process.exit(1);
}

// 创建客户状态管理器
const customerStatusManager = new CustomerStatusManager(config.customerStatus);

// 客户状态管理器事件监听
customerStatusManager.on('statusUpdated', (data) => {
  console.log(`客户状态更新: ${data.customerName}, 新状态: ${data.newStatus}`);
});

customerStatusManager.on('statusUpdateError', (error) => {
  console.error('客户状态更新出错:', error);
});

// 启动客户状态管理器
customerStatusManager.start();

// 创建HTTP服务器
const server = http.createServer(async (req, res) => {
  // 设置CORS头
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // 处理OPTIONS请求
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;

  // 客户数据API
  if (pathname === '/api/customers') {
    if (req.method === 'GET') {
      try {
        const customers = await getAllCustomersAPI();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(customers));
      } catch (error) {
        console.error('获取客户数据出错:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: '获取客户数据出错: ' + error.message }));
      }
    }
  }
  // 获取客户详细信息
  else if (pathname.startsWith('/api/customers/') && pathname.endsWith('/details')) {
    if (req.method === 'GET') {
      try {
        const customerName = decodeURIComponent(pathname.split('/')[3]);
        const customer = await getCustomerAPI(customerName);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(customer));
      } catch (error) {
        console.error('获取客户详细信息出错:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: '获取客户详细信息出错: ' + error.message }));
      }
    }
  }
  // 检查客户状态
  else if (pathname.startsWith('/api/customers/') && pathname.includes('/check-status')) {
    if (req.method === 'POST') {
      try {
        const customerName = decodeURIComponent(pathname.split('/')[3]);
        const customer = await getCustomerAPI(customerName);

        // 更新客户状态
        const updatedCustomer = await updateCustomerStatusAPI(
          customerName,
          customer.status,
          '系统',
          `自动状态更新: ${customer.status}`
        );

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          status: updatedCustomer.status,
          packProgress: updatedCustomer.packProgress,
          packedCount: updatedCustomer.packedCount,
          totalParts: updatedCustomer.totalParts,
          packSeqs: updatedCustomer.packSeqs,
          statusHistory: updatedCustomer.statusHistory
        }));
      } catch (error) {
        console.error('检查客户状态出错:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: '检查客户状态出错: ' + error.message }));
      }
    }
  }
  // 归档客户
  else if (pathname.startsWith('/api/customers/') && pathname.includes('/archive')) {
    if (req.method === 'POST') {
      try {
        const customerName = decodeURIComponent(pathname.split('/')[3]);
        const customer = await getCustomerAPI(customerName);

        // 检查客户当前状态
        if (customer.status !== CustomerStatus.PACKED) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: '只有已打包的客户才能归档' }));
          return;
        }

        // 更新客户状态为已归档
        const updatedCustomer = await updateCustomerStatusAPI(
          customerName,
          CustomerStatus.ARCHIVED,
          '系统',
          '客户归档'
        );

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          status: updatedCustomer.status,
          statusHistory: updatedCustomer.statusHistory
        }));
      } catch (error) {
        console.error('归档客户出错:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: '归档客户出错: ' + error.message }));
      }
    }
  }
  // 出货
  else if (pathname.startsWith('/api/customers/') && pathname.includes('/ship')) {
    if (req.method === 'POST') {
      try {
        const customerName = decodeURIComponent(pathname.split('/')[3]);
        const customer = await getCustomerAPI(customerName);

        // 检查客户当前状态
        if (customer.status !== CustomerStatus.PACKED && customer.status !== CustomerStatus.IN_PROGRESS) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: '只有已打包或正在处理的客户才能出货' }));
          return;
        }

        // 更新客户状态为已出货
        const updatedCustomer = await updateCustomerStatusAPI(
          customerName,
          CustomerStatus.SHIPPED,
          '系统',
          '客户出货'
        );

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          status: updatedCustomer.status,
          statusHistory: updatedCustomer.statusHistory
        }));
      } catch (error) {
        console.error('出货出错:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: '出货出错: ' + error.message }));
      }
    }
  }
  // 标记为未出货
  else if (pathname.startsWith('/api/customers/') && pathname.includes('/mark-not-shipped')) {
    if (req.method === 'POST') {
      try {
        const customerName = decodeURIComponent(pathname.split('/')[3]);
        const customer = await getCustomerAPI(customerName);

        // 检查客户当前状态
        if (customer.status !== CustomerStatus.PACKED && customer.status !== CustomerStatus.IN_PROGRESS) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: '只有已打包或正在处理的客户才能标记为未出货' }));
          return;
        }

        // 更新客户状态为未出货
        const updatedCustomer = await updateCustomerStatusAPI(
          customerName,
          CustomerStatus.NOT_SHIPPED,
          '系统',
          '标记为未出货'
        );

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          status: updatedCustomer.status,
          statusHistory: updatedCustomer.statusHistory
        }));
      } catch (error) {
        console.error('标记为未出货出错:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: '标记为未出货出错: ' + error.message }));
      }
    }
  }
  // 获取按状态筛选的客户
  else if (pathname.startsWith('/api/customers/status/')) {
    if (req.method === 'GET') {
      try {
        const status = pathname.split('/')[4];
        const customers = await getCustomersByStatusAPI(status);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(customers));
      } catch (error) {
        console.error('获取按状态筛选的客户出错:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: '获取按状态筛选的客户出错: ' + error.message }));
      }
    }
  }
  // 获取数据同步服务状态
  else if (pathname === '/api/sync/status') {
    if (req.method === 'GET') {
      try {
        const status = dataSyncService.getStatus();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(status));
      } catch (error) {
        console.error('获取数据同步服务状态出错:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: '获取数据同步服务状态出错: ' + error.message }));
      }
    }
  }
  // 未找到的API
  else {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
  }
});

// 启动HTTP服务器
const port = 3001;
server.listen(port, () => {
  console.log(`服务器已启动，端口: ${port}`);
  console.log(`数据同步服务已启动，配置: ${JSON.stringify(config.dataSync, null, 2)}`);
});

// 处理进程退出事件
process.on('SIGINT', () => {
  console.log('正在关闭服务器...');
  dataSyncService.stop();
  server.close(() => {
    console.log('服务器已关闭');
    process.exit(0);
  });
});
