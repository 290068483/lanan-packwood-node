const http = require('http');
const fs = require('fs');
const path = require('path');

// Mock DataManager
jest.mock('../utils/data-manager', () => {
  return {
    getAllCustomers: jest.fn(),
    upsertCustomer: jest.fn(),
    updateCustomerStatus: jest.fn(),
    getSettings: jest.fn(() => ({}))
  };
});

// Mock main functions
jest.mock('../main', () => {
  return {
    processAllCustomers: jest.fn()
  };
});

const DataManager = require('../utils/data-manager');
const { processAllCustomers } = require('../main');

describe('UI API Tests', () => {
  let testServer;
  let testPort;
  
  beforeAll((done) => {
    // 动态查找可用端口
    testServer = http.createServer();
    testServer.listen(0, () => {
      testPort = testServer.address().port;
      done();
    });
  });
  
  afterAll((done) => {
    if (testServer) {
      testServer.close(done);
    } else {
      done();
    }
  });
  
  beforeEach(() => {
    // 清除所有mock调用记录
    jest.clearAllMocks();
  });
  
  // 模拟处理API请求的函数
  function handleApiRequest(req, res) {
    if (req.url === '/api/customers' && req.method === 'GET') {
      // 获取所有客户
      const customers = DataManager.getAllCustomers();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(customers));
    } else if (req.url === '/api/run' && req.method === 'POST') {
      // 运行主程序
      processAllCustomers.mockResolvedValue();
      processAllCustomers();
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, message: '程序开始运行' }));
    } else if (req.url === '/api/config' && req.method === 'GET') {
      // 获取配置
      const configPath = path.join(__dirname, '../../config.json');
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
    } else if (req.url === '/api/config' && req.method === 'POST') {
      // 更新配置
      let body = '';
      req.on('data', chunk => {
        body += chunk.toString();
      });
      req.on('end', () => {
        try {
          const newConfigData = JSON.parse(body);
          
          // 读取现有配置
          const configPath = path.join(__dirname, '../../config.json');
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
    } else {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Not found' }));
    }
  }
  
  test('should get customers list', async () => {
    // 模拟客户数据
    const mockCustomers = [
      {
        name: 'Test Customer',
        sourcePath: '/test/source',
        outputPath: '/test/output',
        status: '已处理',
        lastUpdate: new Date().toISOString()
      }
    ];
    
    DataManager.getAllCustomers.mockReturnValue(mockCustomers);
    
    // 创建临时服务器处理请求
    const tempServer = http.createServer((req, res) => {
      if (req.url === '/api/customers' && req.method === 'GET') {
        const customers = DataManager.getAllCustomers();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(customers));
      } else {
        res.writeHead(404);
        res.end('Not found');
      }
    });
    
    return new Promise((resolve) => {
      tempServer.listen(0, async () => {
        const port = tempServer.address().port;
        try {
          const response = await fetch(`http://localhost:${port}/api/customers`);
          const customers = await response.json();
          
          expect(response.status).toBe(200);
          expect(customers).toEqual(mockCustomers);
          expect(DataManager.getAllCustomers).toHaveBeenCalled();
          tempServer.close();
          resolve();
        } catch (error) {
          tempServer.close();
          throw error;
        }
      });
    });
  });
  
  test('should start processing when run API is called', async () => {
    processAllCustomers.mockResolvedValue();
    
    // 创建临时服务器处理请求
    const tempServer = http.createServer((req, res) => {
      if (req.url === '/api/run' && req.method === 'POST') {
        processAllCustomers();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, message: '程序开始运行' }));
      } else {
        res.writeHead(404);
        res.end('Not found');
      }
    });
    
    return new Promise((resolve) => {
      tempServer.listen(0, async () => {
        const port = tempServer.address().port;
        try {
          const response = await fetch(`http://localhost:${port}/api/run`, {
            method: 'POST'
          });
          
          const result = await response.json();
          
          expect(response.status).toBe(200);
          expect(result.success).toBe(true);
          expect(processAllCustomers).toHaveBeenCalled();
          tempServer.close();
          resolve();
        } catch (error) {
          tempServer.close();
          throw error;
        }
      });
    });
  });
  
  test('should save config correctly', async () => {
    // 备份原始配置文件
    const configPath = path.join(__dirname, '../../config.json');
    const originalConfig = fs.readFileSync(configPath, 'utf8');
    
    try {
      const newConfig = {
        sourcePath: '/new/source/path',
        localPath: '/new/local/path',
        networkPath: '/new/network/path'
      };
      
      // 创建临时服务器处理请求
      const tempServer = http.createServer((req, res) => {
        if (req.url === '/api/config' && req.method === 'POST') {
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
        } else {
          res.writeHead(404);
          res.end('Not found');
        }
      });
      
      await new Promise((resolve) => {
        tempServer.listen(0, async () => {
          const port = tempServer.address().port;
          try {
            const response = await fetch(`http://localhost:${port}/api/config`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify(newConfig)
            });
            
            const result = await response.json();
            
            expect(response.status).toBe(200);
            expect(result.success).toBe(true);
            
            // 验证配置文件是否更新
            const updatedConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
            expect(updatedConfig.sourcePath).toBe(newConfig.sourcePath);
            expect(updatedConfig.localPath).toBe(newConfig.localPath);
            expect(updatedConfig.networkPath).toBe(newConfig.networkPath);
            tempServer.close();
            resolve();
          } catch (error) {
            tempServer.close();
            throw error;
          }
        });
      });
    } finally {
      // 恢复原始配置
      fs.writeFileSync(configPath, originalConfig, 'utf8');
    }
  });
  
  test('should load config correctly', async () => {
    // 创建临时服务器处理请求
    const tempServer = http.createServer((req, res) => {
      if (req.url === '/api/config' && req.method === 'GET') {
        const configPath = path.join(__dirname, '../../config.json');
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
      } else {
        res.writeHead(404);
        res.end('Not found');
      }
    });
    
    return new Promise((resolve) => {
      tempServer.listen(0, async () => {
        const port = tempServer.address().port;
        try {
          const response = await fetch(`http://localhost:${port}/api/config`);
          const config = await response.json();
          
          expect(response.status).toBe(200);
          expect(config).toHaveProperty('sourcePath');
          expect(config).toHaveProperty('localPath');
          expect(config).toHaveProperty('networkPath');
          tempServer.close();
          resolve();
        } catch (error) {
          tempServer.close();
          throw error;
        }
      });
    });
  });
});