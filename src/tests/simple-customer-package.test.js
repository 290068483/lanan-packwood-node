const assert = require('assert');
const fs = require('fs');
const path = require('path');
const CustomerPackageUtils = require('../utils/customer-package-utils');
const PackageDataExtractor = require('../utils/package-data-extractor');
const FileWatcher = require('../utils/file-watcher');

describe('Simple Customer Package Tests', function() {
  // 测试数据
  const testDir = path.join(__dirname, '..', '..', 'test-simple');
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

  // 创建测试目录和文件
  before(function() {
    // 创建目录结构
    if (!fs.existsSync(customerPackageDir)) {
      fs.mkdirSync(customerPackageDir, { recursive: true });
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

  describe('PackageDataExtractor', function() {
    it('应该能够正确提取客户打包数据', function() {
      const result = PackageDataExtractor.extractCustomerPackageData(packagesPath);
      assert.strictEqual(Array.isArray(result), true);
      assert.strictEqual(result.length, 1);
      assert.strictEqual(result[0].customerName, '王大海');
      assert.strictEqual(result[0].packQty, 4);
      assert.strictEqual(result[0].partIdList.length, 4);
      // 验证ID提取逻辑
      assert.strictEqual(result[0].partIdList[0], '9a9e6');
      assert.strictEqual(result[0].partIdList[1], 'db18d');
    });
  });

  describe('CustomerPackageUtils', function() {
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
      
      // 验证保存的数据内容
      const savedData = JSON.parse(fs.readFileSync(result[0], 'utf8'));
      assert.strictEqual(savedData.length, 1);
      assert.strictEqual(savedData[0].customerName, '王大海');
      assert.strictEqual(savedData[0].packQty, 4);
      
      // 清理生成的文件
      const savedDir = path.dirname(result[0]);
      if (fs.existsSync(savedDir)) {
        fs.rmSync(savedDir, { recursive: true, force: true });
      }
    });
    
    it('应该能够扫描并处理所有客户目录', function() {
      // 重定向console.log以验证输出
      const logs = [];
      const originalLog = console.log;
      console.log = function(...args) {
        logs.push(args.join(' '));
        originalLog.apply(console, args);
      };
      
      CustomerPackageUtils.scanAndProcessAllCustomers(testConfig);
      
      // 恢复console.log
      console.log = originalLog;
      
      // 验证至少有日志输出
      assert(logs.length > 0);
      // 验证有发现客户目录的日志
      assert(logs.some(log => log.includes('发现')));
      // 验证有处理客户目录的日志
      assert(logs.some(log => log.includes('处理客户目录')));
    });
  });

  describe('FileWatcher', function() {
    it('应该能够创建FileWatcher实例', function() {
      const fileWatcher = new FileWatcher(testConfig);
      assert(fileWatcher instanceof FileWatcher);
      assert.strictEqual(fileWatcher.config, testConfig);
    });
  });
});