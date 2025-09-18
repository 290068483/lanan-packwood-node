const fs = require('fs');
const path = require('path');
const url = require('url');
const http = require('http'); // 移到最前面
const { exec } = require('child_process'); // 添加child_process模块导入
const crypto = require('crypto'); // 添加crypto模块
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
  // 从源路径获取客户数据
  else if (pathname === '/api/customers/source') {
    if (req.method === 'GET') {
      try {
        // 读取配置
        const configPath = path.join(__dirname, '../../config.json');
        if (!fs.existsSync(configPath)) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: '配置文件不存在' }));
          return;
        }
        
        const configContent = fs.readFileSync(configPath, 'utf8');
        const config = JSON.parse(configContent);
        
        // 检查源路径是否存在
        const sourcePath = config.sourcePath;
        if (!sourcePath) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: '未配置源路径' }));
          return;
        }
        
        // 读取源路径中的客户目录
        let customerDirs = [];
        try {
          customerDirs = fs.readdirSync(sourcePath)
            .filter(dir => {
              const fullPath = path.join(sourcePath, dir);
              return fs.statSync(fullPath).isDirectory();
            });
        } catch (error) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: '读取客户目录出错: ' + error.message }));
          return;
        }
        
        // 处理每个客户目录
        const customers = [];
        for (const dir of customerDirs) {
          try {
            // 解析客户名称（从目录名中提取）
            const customerName = dir.replace(/^\d{6}_/, '').replace(/#$/, '');
            
            // 获取客户目录路径
            const customerDirPath = path.join(sourcePath, dir);
            
            // 检查是否有packages.json文件
            const packagesPath = path.join(customerDirPath, 'packages.json');
            let packagesData = [];
            let packProgress = 0;
            let packSeqs = [];
            
            if (fs.existsSync(packagesPath)) {
              packagesData = JSON.parse(fs.readFileSync(packagesPath, 'utf8'));
              
              // 计算打包进度
              if (Array.isArray(packagesData)) {
                // 获取所有partIDs
                const allPartIDs = [];
                packagesData.forEach(pkg => {
                  if (pkg.partIDs && Array.isArray(pkg.partIDs)) {
                    allPartIDs.push(...pkg.partIDs);
                  }
                });
                
                // 获取包号
                packSeqs = packagesData.map(pkg => pkg.packSeq || '').filter(seq => seq);
                
                // 假设客户数据中所有板件都需要打包
                // 这里需要根据实际情况调整
                const totalParts = allPartIDs.length;
                packProgress = totalParts > 0 ? Math.round(100) : 0; // 假设所有板件都已打包
              }
            }
            
            // 确定客户状态
            let status = '未打包';
            if (packProgress === 100) {
              status = '已打包';
            } else if (packProgress > 0) {
              status = '正在处理';
            }
            
            // 添加到客户列表
            customers.push({
              name: customerName,
              status,
              packProgress,
              packSeqs,
              lastUpdate: new Date().toISOString()
            });
          } catch (error) {
            console.error(`处理客户目录 ${dir} 出错:`, error);
          }
        }
        
        // 返回客户数据
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(customers));
      } catch (error) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: '获取客户数据出错: ' + error.message }));
      }
    }
  }
  // 处理客户请求
  else if (pathname === '/api/customers') {
    if (req.method === 'GET') {
      // 从数据库获取所有客户
      const { getAllCustomers } = require('../database/models/customer');
      getAllCustomers().then(customers => {
        // 转换为前端需要的格式
        const formattedCustomers = customers.map(customer => ({
          name: customer.name,
          status: customer.status,
          packProgress: customer.packProgress,
          packedCount: customer.packedCount,
          totalParts: customer.totalParts,
          packSeqs: customer.packSeqs,
          lastUpdate: customer.lastUpdate
        }));
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(formattedCustomers));
      }).catch(error => {
        console.error('获取客户数据出错:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: '获取客户数据出错: ' + error.message }));
      });
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
  // 检查客户状态
  else if (pathname.startsWith('/api/customers/') && pathname.includes('/check-status')) {
    if (req.method === 'POST') {
      try {
        const customerName = decodeURIComponent(pathname.split('/')[3]);
        
        // 读取配置
        const configPath = path.join(__dirname, '../../config.json');
        if (!fs.existsSync(configPath)) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: '配置文件不存在' }));
          return;
        }
        
        const configContent = fs.readFileSync(configPath, 'utf8');
        const config = JSON.parse(configContent);
        
        // 检查源路径是否存在
        const sourcePath = config.sourcePath;
        if (!sourcePath) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: '未配置源路径' }));
          return;
        }
        
        // 构建客户目录路径
        let customerDirName = `250901_${customerName}#`; // 使用当前日期作为前缀
        let customerDirPath = path.join(sourcePath, customerDirName);
        
        // 如果目录不存在，尝试查找匹配的客户目录
        if (!fs.existsSync(customerDirPath) || !fs.statSync(customerDirPath).isDirectory()) {
          // 查找匹配的客户目录
          const dirs = fs.readdirSync(sourcePath)
            .filter(dir => {
              const fullPath = path.join(sourcePath, dir);
              return fs.statSync(fullPath).isDirectory() && dir.includes(customerName);
            });
          
          if (dirs.length > 0) {
            // 使用第一个匹配的目录
            customerDirName = dirs[0];
            customerDirPath = path.join(sourcePath, customerDirName);
          } else {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: '客户目录不存在' }));
            return;
          }
        }
        
        // 检查客户目录是否存在
        if (!fs.existsSync(customerDirPath) || !fs.statSync(customerDirPath).isDirectory()) {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: '客户目录不存在' }));
          return;
        }
        
        // 读取客户数据
        let customerData = {};
        const customerDataPath = path.join(customerDirPath, 'customer.json');
        if (fs.existsSync(customerDataPath)) {
          customerData = JSON.parse(fs.readFileSync(customerDataPath, 'utf8'));
        }
        
        // 读取packages.json数据
        let packagesData = [];
        const packagesPath = path.join(customerDirPath, 'packages.json');
        if (fs.existsSync(packagesPath)) {
          packagesData = JSON.parse(fs.readFileSync(packagesPath, 'utf8'));
        }
        
        // 检查打包状态
        const statusManager = require('../utils/status-manager');
        const packStatus = statusManager.checkPackStatus(customerData, packagesData);
        
        // 更新客户状态
        const updatedCustomer = statusManager.updateCustomerStatus(
          customerData,
          packStatus.status,
          '系统',
          `自动状态更新: ${packStatus.status}`
        );
        
        // 保存更新后的客户数据
        fs.writeFileSync(customerDataPath, JSON.stringify(updatedCustomer, null, 2));
        
        // 返回状态信息
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          status: packStatus.status,
          packProgress: packStatus.packProgress,
          packedCount: packStatus.packedCount,
          totalParts: packStatus.totalParts,
          packSeqs: packStatus.packSeqs,
          statusHistory: statusManager.getStatusHistory(updatedCustomer)
        }));
      } catch (error) {
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
        
        // 读取配置
        const configPath = path.join(__dirname, '../../config.json');
        if (!fs.existsSync(configPath)) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: '配置文件不存在' }));
          return;
        }
        
        const configContent = fs.readFileSync(configPath, 'utf8');
        const config = JSON.parse(configContent);
        
        // 检查源路径是否存在
        const sourcePath = config.sourcePath;
        if (!sourcePath) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: '未配置源路径' }));
          return;
        }
        
        // 构建客户目录路径
        let customerDirName = `250901_${customerName}#`; // 使用当前日期作为前缀
        let customerDirPath = path.join(sourcePath, customerDirName);
        
        // 如果目录不存在，尝试查找匹配的客户目录
        if (!fs.existsSync(customerDirPath) || !fs.statSync(customerDirPath).isDirectory()) {
          // 查找匹配的客户目录
          const dirs = fs.readdirSync(sourcePath)
            .filter(dir => {
              const fullPath = path.join(sourcePath, dir);
              return fs.statSync(fullPath).isDirectory() && dir.includes(customerName);
            });
          
          if (dirs.length > 0) {
            // 使用第一个匹配的目录
            customerDirName = dirs[0];
            customerDirPath = path.join(sourcePath, customerDirName);
          } else {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: '客户目录不存在' }));
            return;
          }
        }
        
        // 检查客户目录是否存在
        if (!fs.existsSync(customerDirPath) || !fs.statSync(customerDirPath).isDirectory()) {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: '客户目录不存在' }));
          return;
        }
        
        // 读取客户数据
        let customerData = {};
        const customerDataPath = path.join(customerDirPath, 'customer.json');
        if (fs.existsSync(customerDataPath)) {
          customerData = JSON.parse(fs.readFileSync(customerDataPath, 'utf8'));
        }
        
        // 检查客户当前状态
        if (customerData.status !== '已打包') {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: '只有已打包的客户才能归档' }));
          return;
        }
        
        // 更新客户状态为已归档
        const statusManager = require('../utils/status-manager');
        const updatedCustomer = statusManager.updateCustomerStatus(
          customerData,
          statusManager.CustomerStatus.ARCHIVED,
          '系统',
          '客户归档'
        );
        
        // 保存更新后的客户数据
        fs.writeFileSync(customerDataPath, JSON.stringify(updatedCustomer, null, 2));
        
        // 返回状态信息
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          status: statusManager.CustomerStatus.ARCHIVED,
          statusHistory: statusManager.getStatusHistory(updatedCustomer)
        }));
      } catch (error) {
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
        
        // 读取配置
        const configPath = path.join(__dirname, '../../config.json');
        if (!fs.existsSync(configPath)) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: '配置文件不存在' }));
          return;
        }
        
        const configContent = fs.readFileSync(configPath, 'utf8');
        const config = JSON.parse(configContent);
        
        // 检查源路径是否存在
        const sourcePath = config.sourcePath;
        if (!sourcePath) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: '未配置源路径' }));
          return;
        }
        
        // 构建客户目录路径
        let customerDirName = `250901_${customerName}#`; // 使用当前日期作为前缀
        let customerDirPath = path.join(sourcePath, customerDirName);
        
        // 如果目录不存在，尝试查找匹配的客户目录
        if (!fs.existsSync(customerDirPath) || !fs.statSync(customerDirPath).isDirectory()) {
          // 查找匹配的客户目录
          const dirs = fs.readdirSync(sourcePath)
            .filter(dir => {
              const fullPath = path.join(sourcePath, dir);
              return fs.statSync(fullPath).isDirectory() && dir.includes(customerName);
            });
          
          if (dirs.length > 0) {
            // 使用第一个匹配的目录
            customerDirName = dirs[0];
            customerDirPath = path.join(sourcePath, customerDirName);
          } else {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: '客户目录不存在' }));
            return;
          }
        }
        
        // 检查客户目录是否存在
        if (!fs.existsSync(customerDirPath) || !fs.statSync(customerDirPath).isDirectory()) {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: '客户目录不存在' }));
          return;
        }
        
        // 读取客户数据
        let customerData = {};
        const customerDataPath = path.join(customerDirPath, 'customer.json');
        if (fs.existsSync(customerDataPath)) {
          customerData = JSON.parse(fs.readFileSync(customerDataPath, 'utf8'));
        }
        
        // 检查客户当前状态
        if (customerData.status !== '已归档') {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: '只有已归档的客户才能出货' }));
          return;
        }
        
        // 更新客户状态为已出货
        const statusManager = require('../utils/status-manager');
        const updatedCustomer = statusManager.updateCustomerStatus(
          customerData,
          statusManager.CustomerStatus.SHIPPED,
          '系统',
          '客户出货'
        );
        
        // 保存更新后的客户数据
        fs.writeFileSync(customerDataPath, JSON.stringify(updatedCustomer, null, 2));
        
        // 返回状态信息
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          status: statusManager.CustomerStatus.SHIPPED,
          statusHistory: statusManager.getStatusHistory(updatedCustomer)
        }));
      } catch (error) {
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
        
        // 读取配置
        const configPath = path.join(__dirname, '../../config.json');
        if (!fs.existsSync(configPath)) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: '配置文件不存在' }));
          return;
        }
        
        const configContent = fs.readFileSync(configPath, 'utf8');
        const config = JSON.parse(configContent);
        
        // 检查源路径是否存在
        const sourcePath = config.sourcePath;
        if (!sourcePath) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: '未配置源路径' }));
          return;
        }
        
        // 构建客户目录路径
        let customerDirName = `250901_${customerName}#`; // 使用当前日期作为前缀
        let customerDirPath = path.join(sourcePath, customerDirName);
        
        // 如果目录不存在，尝试查找匹配的客户目录
        if (!fs.existsSync(customerDirPath) || !fs.statSync(customerDirPath).isDirectory()) {
          // 查找匹配的客户目录
          const dirs = fs.readdirSync(sourcePath)
            .filter(dir => {
              const fullPath = path.join(sourcePath, dir);
              return fs.statSync(fullPath).isDirectory() && dir.includes(customerName);
            });
          
          if (dirs.length > 0) {
            // 使用第一个匹配的目录
            customerDirName = dirs[0];
            customerDirPath = path.join(sourcePath, customerDirName);
          } else {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: '客户目录不存在' }));
            return;
          }
        }
        
        // 检查客户目录是否存在
        if (!fs.existsSync(customerDirPath) || !fs.statSync(customerDirPath).isDirectory()) {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: '客户目录不存在' }));
          return;
        }
        
        // 读取客户数据
        let customerData = {};
        const customerDataPath = path.join(customerDirPath, 'customer.json');
        if (fs.existsSync(customerDataPath)) {
          customerData = JSON.parse(fs.readFileSync(customerDataPath, 'utf8'));
        }
        
        // 检查客户当前状态
        if (customerData.status !== '已归档') {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: '只有已归档的客户才能标记为未出货' }));
          return;
        }
        
        // 更新客户状态为未出货
        const statusManager = require('../utils/status-manager');
        const updatedCustomer = statusManager.updateCustomerStatus(
          customerData,
          statusManager.CustomerStatus.NOT_SHIPPED,
          '系统',
          '标记为未出货'
        );
        
        // 保存更新后的客户数据
        fs.writeFileSync(customerDataPath, JSON.stringify(updatedCustomer, null, 2));
        
        // 返回状态信息
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          status: statusManager.CustomerStatus.NOT_SHIPPED,
          statusHistory: statusManager.getStatusHistory(updatedCustomer)
        }));
      } catch (error) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: '标记为未出货出错: ' + error.message }));
      }
    }
  }
  // 获取客户详细信息
  else if (pathname.startsWith('/api/customers/') && pathname.endsWith('/details')) {
    if (req.method === 'GET') {
      try {
        const customerName = decodeURIComponent(pathname.split('/')[3]);
        
        // 读取配置
        const configPath = path.join(__dirname, '../../config.json');
        if (!fs.existsSync(configPath)) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: '配置文件不存在' }));
          return;
        }
        
        const configContent = fs.readFileSync(configPath, 'utf8');
        const config = JSON.parse(configContent);
        
        // 检查源路径是否存在
        const sourcePath = config.sourcePath;
        if (!sourcePath) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: '未配置源路径' }));
          return;
        }
        
        // 构建客户目录路径 - 根据实际目录命名规则调整
        // 客户目录通常以日期开头，后跟客户名称和#号
        let customerDirName = `250901_${customerName}#`; // 使用当前日期作为前缀
        let customerDirPath = path.join(sourcePath, customerDirName);
        
        // 如果目录不存在，尝试查找匹配的客户目录
        if (!fs.existsSync(customerDirPath) || !fs.statSync(customerDirPath).isDirectory()) {
          // 查找匹配的客户目录
          const dirs = fs.readdirSync(sourcePath)
            .filter(dir => {
              const fullPath = path.join(sourcePath, dir);
              return fs.statSync(fullPath).isDirectory() && dir.includes(customerName);
            });
          
          if (dirs.length > 0) {
            // 使用第一个匹配的目录
            customerDirName = dirs[0];
            customerDirPath = path.join(sourcePath, customerDirName);
          } else {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: '客户目录不存在' }));
            return;
          }
        }
        
        // 检查客户目录是否存在
        if (!fs.existsSync(customerDirPath) || !fs.statSync(customerDirPath).isDirectory()) {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: '客户目录不存在' }));
          return;
        }
        
        // 检查是否有packages.json文件
        const packagesPath = path.join(customerDirPath, 'packages.json');
        let packagesData = [];
        let packProgress = 0;
        let packSeqs = [];
        let status = '未打包';
        
        if (fs.existsSync(packagesPath)) {
          packagesData = JSON.parse(fs.readFileSync(packagesPath, 'utf8'));
          
          // 计算打包进度
          if (Array.isArray(packagesData)) {
            // 获取所有partIDs
            const allPartIDs = [];
            packagesData.forEach(pkg => {
              if (pkg.partIDs && Array.isArray(pkg.partIDs)) {
                allPartIDs.push(...pkg.partIDs);
              }
            });
            
            // 获取包号
            packSeqs = packagesData.map(pkg => pkg.packSeq || '').filter(seq => seq);
            
            // 假设客户数据中所有板件都需要打包
            // 这里需要根据实际情况调整
            const totalParts = allPartIDs.length;
            packProgress = totalParts > 0 ? Math.round(100) : 0; // 假设所有板件都已打包
            
            // 确定客户状态
            if (packProgress === 100) {
              status = '已打包';
            } else if (packProgress > 0) {
              status = '正在处理';
            }
          }
        }
        
        // 返回客户详细信息
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          name: customerName,
          status,
          packProgress,
          packSeqs,
          lastUpdate: new Date().toISOString()
        }));
      } catch (error) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: '获取客户详细信息出错: ' + error.message }));
      }
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
const PORT = process.env.PORT || 3000; // 使用3000端口
server.listen(PORT, () => {
  console.log(`服务器运行在端口 ${PORT}`);
  console.log(`访问地址: http://localhost:${PORT}`);
});

module.exports = server;