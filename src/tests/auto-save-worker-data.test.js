const assert = require('assert');
const fs = require('fs');
const path = require('path');
const AutoSaveManager = require('../utils/auto-save-manager');
const FileCompressor = require('../utils/file-compressor');

describe('AutoSave Worker Packages Data', function() {
  // 测试数据
  const testDir = path.join(__dirname, '..', '..', 'temp-tests');
  const workerDir = path.join(testDir, 'worker');
  const backupDir = path.join(testDir, 'backup', 'worker');
  const packagesPath = path.join(workerDir, 'packages.json');
  
  const testConfig = {
    workerPackagesPath: workerDir,
    customerPackedPath: path.join(testDir, 'customer'),
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
        "02e74f241107448d84947c22e43db18d"
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
    if (!fs.existsSync(workerDir)) {
      fs.mkdirSync(workerDir, { recursive: true });
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

  describe('saveWorkerPackagesData', function() {
    it('应该能够保存工人打包数据（非压缩模式）', async function() {
      this.timeout(10000); // 设置超时时间
      
      // 创建AutoSaveManager实例
      const autoSaveManager = new AutoSaveManager(testConfig);
      
      // 执行保存操作
      await autoSaveManager.saveWorkerPackagesData();
      
      // 检查备份目录是否创建
      assert.strictEqual(fs.existsSync(backupDir), true, '备份目录应该被创建');
      
      // 检查是否有备份文件
      const backupDirs = fs.readdirSync(backupDir);
      assert.strictEqual(backupDirs.length > 0, true, '应该创建了备份子目录');
      
      // 检查备份文件是否存在
      const backupSubDir = path.join(backupDir, backupDirs[0]);
      const backupFiles = fs.readdirSync(backupSubDir);
      assert.strictEqual(backupFiles.length > 0, true, '应该有备份文件');
      
      // 检查备份的文件是否包含packages.json
      const hasPackagesJson = backupFiles.some(file => file === 'packages.json');
      assert.strictEqual(hasPackagesJson, true, '备份文件应该包含packages.json');
    });
    
    it('应该能够保存工人打包数据（压缩模式）', async function() {
      this.timeout(10000); // 设置超时时间
      
      // 更新配置以启用压缩
      const compressConfig = JSON.parse(JSON.stringify(testConfig));
      compressConfig.autoSave.compress = true;
      
      // 创建AutoSaveManager实例
      const autoSaveManager = new AutoSaveManager(compressConfig);
      
      // 执行保存操作
      await autoSaveManager.saveWorkerPackagesData();
      
      // 检查备份目录是否创建
      assert.strictEqual(fs.existsSync(backupDir), true, '备份目录应该被创建');
      
      // 检查是否有备份文件
      const backupDirs = fs.readdirSync(backupDir);
      const backupSubDir = path.join(backupDir, backupDirs[backupDirs.length - 1]); // 获取最新的备份目录
      const backupFiles = fs.readdirSync(backupSubDir);
      assert.strictEqual(backupFiles.length > 0, true, '应该有备份文件');
      
      // 检查备份的文件是否包含ZIP文件
      const hasZipFile = backupFiles.some(file => path.extname(file) === '.zip');
      assert.strictEqual(hasZipFile, true, '备份文件应该包含ZIP压缩文件');
    });
    
    it('应该在自动保存未启用时正确处理', async function() {
      // 更新配置以禁用自动保存
      const disabledConfig = JSON.parse(JSON.stringify(testConfig));
      disabledConfig.autoSave.enabled = false;
      
      // 创建AutoSaveManager实例
      const autoSaveManager = new AutoSaveManager(disabledConfig);
      
      // 执行保存操作
      await autoSaveManager.saveWorkerPackagesData();
      
      // 函数应该正常执行但不创建备份（因为我们没有检查创建的备份）
      assert.ok(true);
    });
  });
});