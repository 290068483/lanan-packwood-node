const assert = require('assert');
const fs = require('fs');
const path = require('path');
const CustomerPackageUtils = require('../utils/customer-package-utils');
const PackageDataExtractor = require('../utils/package-data-extractor');
const FileWatcher = require('../utils/file-watcher');

describe('CustomerPackageUtils', function() {
  // 测试数据
  const testDir = path.join(__dirname, '..', '..', 'test-temp');
  const workerDir = path.join(testDir, 'worker');
  const customerDir = path.join(testDir, 'customer');
  const customerPackageDir = path.join(workerDir, '250915 王大海#');
  const packagesPath = path.join(customerPackageDir, 'packages.json');
  
  const testConfig = {
    workerPackagesPath: workerDir,
    customerPackedPath: customerDir,
    autoSave: {
      enabled: true,
      saveMode: 'onChange',
      intervalMinutes: 5,
      compress: false
    }
  };
  
  const testPackagesData = [
    {
      "deliveryID": "",
      "diyPackType": "",
      "isDelete": false,
      "operateUserCode": "",
      "operateUserName": "",
      "packConfirm": 8392040,
      "packDate": "2025-09-15 10:52:30",
      "packID": "3a804d5951c244f084a67612413d9783",
      "packNo": "1110953111252",
      "packQty": 4,
      "packSeq": "1",
      "packState": 1,
      "packType": 0,
      "packUserCode": "打包员1",
      "packUserName": "打包员1",
      "partIDs": [
        "58b2e383702249219bc6744e0419a9e6",
        "02e74f241107448d84947c22e43db18d",
        "92b0350c40034acea092f1f99dcd1ea4",
        "d3ad19afc3d14a8b950021003c89b68c"
      ],
      "partItems": [],
      "storeArea": "",
      "storeDate": "",
      "storeUserCode": "",
      "storeUserName": ""
    }
  ];

  // 在所有测试之前创建测试目录和文件
  beforeAll(function() {
    // 确保测试目录存在
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
    
    // 创建客户目录
    if (!fs.existsSync(customerPackageDir)) {
      fs.mkdirSync(customerPackageDir, { recursive: true });
    }
    
    // 创建测试 packages.json 文件
    fs.writeFileSync(packagesPath, JSON.stringify(testPackagesData, null, 2));
  });

  // 在所有测试之后清理测试目录
  afterAll(function() {
    // 删除测试目录
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('extractCustomerPackageData', function() {
    it('应该能够正确提取客户打包数据', function() {
      const result = CustomerPackageUtils.extractCustomerPackageData(packagesPath);
      assert.strictEqual(Array.isArray(result), true);
      assert.strictEqual(result.length, 1);
      assert.strictEqual(result[0].customerName, '王大海');
      assert.strictEqual(result[0].packQty, 4);
      assert.strictEqual(result[0].partIdList.length, 4);
    });
  });

  describe('saveCustomerPackageData', function() {
    it('应该能够保存客户打包数据', async function() {
      this.timeout(5000); // 设置超时时间
      
      const result = await CustomerPackageUtils.saveCustomerPackageData(
        packagesPath,
        customerDir,
        false // 不压缩
      );
      
      assert.strictEqual(Array.isArray(result), true);
      assert.strictEqual(result.length, 1);
      assert.strictEqual(fs.existsSync(result[0]), true);
      
      // 清理生成的文件
      const savedDir = path.dirname(result[0]);
      if (fs.existsSync(savedDir)) {
        fs.rmSync(savedDir, { recursive: true, force: true });
      }
    });
  });

  describe('processCustomerPackages', function() {
    // 在测试前设置
    beforeAll(function() {
      // 确保 customer 目录存在
      if (!fs.existsSync(customerDir)) {
        fs.mkdirSync(customerDir, { recursive: true });
      }
    });

    // 在测试后清理
    afterAll(function() {
      // 清理生成的文件
      const outputFiles = [
        path.join(customerDir, '250915 王大海#.xlsx'),
        path.join(customerDir, '250915 王大海#_剩余.xlsx')
      ];
      
      outputFiles.forEach(file => {
        if (fs.existsSync(file)) {
          fs.unlinkSync(file);
        }
      });
    });

    it('应该能够处理客户打包数据', async function() {
      this.timeout(5000); // 设置超时时间
      
      const result = await CustomerPackageUtils.processCustomerPackages(
        packagesPath,
        customerDir,
        false // 不压缩
      );
      
      assert.strictEqual(Array.isArray(result), true);
      assert.strictEqual(result.length, 1);
      assert.strictEqual(fs.existsSync(result[0]), true);
    });
  });

  describe('scanAndProcessAllCustomers', function() {
    it('应该能够扫描并处理所有客户目录', function(done) {
      // 重定向console.log以验证输出
      const originalLog = console.log;
      let logCount = 0;
      console.log = function() {
        logCount++;
        originalLog.apply(console, arguments);
      };
      
      CustomerPackageUtils.scanAndProcessAllCustomers(testConfig);
      
      // 恢复console.log
      console.log = originalLog;
      
      // 验证至少有日志输出
      assert(logCount > 0);
      done();
    });
  });

  describe('startAutoSave', function() {
    it('应该能够根据配置启动自动保存', function() {
      // 这个测试主要验证函数不会抛出异常
      const result = CustomerPackageUtils.startAutoSave(testConfig);
      assert(result !== undefined);
      
      // 停止监控
      if (result && typeof result.close === 'function') {
        result.close();
      } else if (result && typeof result.unref === 'function') {
        clearInterval(result);
      }
    });
    
    it('当自动保存未启用时应该返回null', function() {
      const disabledConfig = {
        workerPackagesPath: workerDir,
        customerPackedPath: customerDir,
        autoSave: {
          enabled: false
        }
      };
      
      const result = CustomerPackageUtils.startAutoSave(disabledConfig);
      assert.strictEqual(result, null);
    });
  });
});

describe('PackageDataExtractor', function() {
  describe('extractCustomerName', function() {
    it('应该能够从路径中正确提取客户名称', function() {
      const testPath = 'D:/backup_data/backup/worker/250915 王大海#/packages.json';
      const result = PackageDataExtractor.extractCustomerName(testPath);
      assert.strictEqual(result, '王大海');
    });
    
    it('当路径格式不匹配时应该返回目录名', function() {
      const testPath = 'D:/backup_data/backup/worker/other_customer/packages.json';
      const result = PackageDataExtractor.extractCustomerName(testPath);
      assert.strictEqual(result, 'other_customer');
    });
  });
});

describe('FileWatcher', function() {
  const testDir = path.join(__dirname, '..', '..', 'test-temp-fs');
  const customerDir = path.join(testDir, '250915 王大海#');
  const packagesPath = path.join(customerDir, 'packages.json');
  
  const testConfig = {
    workerPackagesPath: testDir
  };
  
  const testPackagesData = [
    {
      "packDate": "2025-09-15 10:52:30",
      "packID": "3a804d5951c244f084a67612413d9783",
      "packQty": 4,
      "packUserName": "打包员1",
      "partIDs": [
        "58b2e383702249219bc6744e0419a9e6",
        "02e74f241107448d84947c22e43db18d"
      ]
    }
  ];

  // 创建测试目录和文件
  before(function() {
    // 创建目录结构
    if (!fs.existsSync(customerDir)) {
      fs.mkdirSync(customerDir, { recursive: true });
    }
    
    // 创建测试用的packages.json文件
    fs.writeFileSync(packagesPath, JSON.stringify(testPackagesData, null, 2));
  });

  // 删除测试目录和文件
  after(function() {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('watchOnChange', function() {
    it('应该能够启动onChange模式的文件监控', function() {
      const fileWatcher = new FileWatcher(testConfig);
      const result = fileWatcher.watchOnChange();
      
      // 验证返回值
      assert(Array.isArray(result) || result === null);
      
      // 停止监控
      fileWatcher.stop();
    });
  });

  describe('watchOnInterval', function() {
    it('应该能够启动onInterval模式的文件监控', function() {
      const fileWatcher = new FileWatcher(testConfig);
      const result = fileWatcher.watchOnInterval(0.01); // 0.01分钟，约0.6秒
      
      // 验证返回值
      assert(Array.isArray(result) || result === null);
      
      // 停止监控
      fileWatcher.stop();
    });
  });
});