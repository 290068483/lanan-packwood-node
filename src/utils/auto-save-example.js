const fs = require('fs');
const path = require('path');
const FileCompressor = require('./file-compressor');

/**
 * 自动保存数据示例脚本
 * 演示如何使用通用压缩工具和配置文件中的路径来保存数据
 */

class AutoSaveManager {
  constructor(config) {
    this.config = config;
    this.workerPackagesPath = config.workerPackagesPath.trim();
    this.customerPackedPath = config.customerPackedPath.trim();
    this.autoSaveConfig = config.autoSave;
  }

  /**
   * 保存工人打包数据
   */
  async saveWorkerPackagesData() {
    try {
      // 检查是否启用了自动保存
      if (!this.autoSaveConfig.enabled) {
        console.log('自动保存未启用');
        return;
      }

      // 检查源目录是否存在
      if (!fs.existsSync(this.workerPackagesPath)) {
        console.log(`工人打包数据目录不存在: ${this.workerPackagesPath}`);
        return;
      }

      // 获取目录中的所有文件
      const files = fs.readdirSync(this.workerPackagesPath);
      if (files.length === 0) {
        console.log('工人打包数据目录为空');
        return;
      }

      // 构建保存路径
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const saveDir = path.join(this.workerPackagesPath, '..', 'backup', 'worker', timestamp);
      
      // 确保保存目录存在
      fs.mkdirSync(saveDir, { recursive: true });

      if (this.autoSaveConfig.compress) {
        // 使用压缩工具保存数据
        const filePaths = files
          .map(file => path.join(this.workerPackagesPath, file))
          .filter(filePath => fs.statSync(filePath).isFile());
        
        if (filePaths.length > 0) {
          const zipPath = path.join(saveDir, `worker-packages-${timestamp}.zip`);
          await FileCompressor.compressFilesToZip(filePaths, zipPath);
          console.log(`工人打包数据已压缩保存到: ${zipPath}`);
        }
      } else {
        // 不使用压缩直接复制文件
        for (const file of files) {
          const srcPath = path.join(this.workerPackagesPath, file);
          const destPath = path.join(saveDir, file);
          
          if (fs.statSync(srcPath).isFile()) {
            fs.copyFileSync(srcPath, destPath);
          }
        }
        console.log(`工人打包数据已保存到: ${saveDir}`);
      }
    } catch (error) {
      console.error('保存工人打包数据时出错:', error.message);
    }
  }

  /**
   * 保存客户已打包数据
   */
  async saveCustomerPackedData() {
    try {
      // 检查是否启用了自动保存
      if (!this.autoSaveConfig.enabled) {
        console.log('自动保存未启用');
        return;
      }

      // 检查源目录是否存在
      if (!fs.existsSync(this.customerPackedPath)) {
        console.log(`客户已打包数据目录不存在: ${this.customerPackedPath}`);
        return;
      }

      // 获取目录中的所有文件
      const files = fs.readdirSync(this.customerPackedPath);
      if (files.length === 0) {
        console.log('客户已打包数据目录为空');
        return;
      }

      // 构建保存路径
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const saveDir = path.join(this.customerPackedPath, '..', 'backup', 'customer', timestamp);
      
      // 确保保存目录存在
      fs.mkdirSync(saveDir, { recursive: true });

      if (this.autoSaveConfig.compress) {
        // 使用压缩工具保存数据
        const filePaths = files
          .map(file => path.join(this.customerPackedPath, file))
          .filter(filePath => fs.statSync(filePath).isFile());
        
        if (filePaths.length > 0) {
          const zipPath = path.join(saveDir, `customer-packed-${timestamp}.zip`);
          await FileCompressor.compressFilesToZip(filePaths, zipPath);
          console.log(`客户已打包数据已压缩保存到: ${zipPath}`);
        }
      } else {
        // 不使用压缩直接复制文件
        for (const file of files) {
          const srcPath = path.join(this.customerPackedPath, file);
          const destPath = path.join(saveDir, file);
          
          if (fs.statSync(srcPath).isFile()) {
            fs.copyFileSync(srcPath, destPath);
          }
        }
        console.log(`客户已打包数据已保存到: ${saveDir}`);
      }
    } catch (error) {
      console.error('保存客户已打包数据时出错:', error.message);
    }
  }

  /**
   * 启动自动保存监控
   */
  startAutoSave() {
    if (!this.autoSaveConfig.enabled) {
      console.log('自动保存未启用');
      return;
    }

    const interval = this.autoSaveConfig.intervalMinutes * 60 * 1000; // 转换为毫秒
    
    console.log(`启动自动保存监控，间隔: ${this.autoSaveConfig.intervalMinutes} 分钟`);
    
    // 立即执行一次保存
    this.saveWorkerPackagesData();
    this.saveCustomerPackedData();
    
    // 设置定时器
    setInterval(() => {
      this.saveWorkerPackagesData();
      this.saveCustomerPackedData();
    }, interval);
  }
}

// 使用示例
if (require.main === module) {
  // 加载配置文件
  const configPath = path.join(__dirname, '..', '..', 'config.json');
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  
  // 创建自动保存管理器
  const autoSaveManager = new AutoSaveManager(config);
  
  // 启动自动保存
  autoSaveManager.startAutoSave();
}

module.exports = AutoSaveManager;