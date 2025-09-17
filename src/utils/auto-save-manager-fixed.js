const fs = require('fs');
const path = require('path');
const FileCompressor = require('./file-compressor');
const CustomerPackageUtils = require('./customer-package-utils');

/**
 * 自动保存管理器
 * 管理工人打包数据和客户已打包数据的自动保存
 */
class AutoSaveManager {
  /**
   * 构造函数
   * @param {Object} config - 配置对象
   */
  constructor(config) {
    this.config = config;
    // 使用专门的自动保存路径，如果不存在则回退到通用路径
    this.workerPackagesPath = (config.autoSaveWorkerPath || config.workerPackagesPath).trim();
    this.customerPackedPath = (config.autoSaveCustomerPath || config.customerPackedPath).trim();
    this.autoSaveConfig = config.autoSave;
    this.watcher = null;
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

      // 构建保存路径 - 使用专门的自动保存路径
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const saveDir = path.join(this.workerPackagesPath, '..', 'backup', 'worker', timestamp);

      // 确保保存目录存在
      fs.mkdirSync(saveDir, { recursive: true });

      if (this.autoSaveConfig.compress) {
        // 使用压缩工具保存数据
        const filePaths = files
          .map(file => path.join(this.workerPackagesPath, file))
          .filter(filePath => {
            try {
              return fs.statSync(filePath).isFile();
            } catch (error) {
              console.warn(`检查文件状态时出错 ${filePath}:`, error.message);
              return false;
            }
          });

        if (filePaths.length > 0) {
          const zipPath = path.join(saveDir, `worker-packages-${timestamp}.zip`);
          try {
            await FileCompressor.compressFilesToZip(filePaths, zipPath);
            console.log(`工人打包数据已压缩保存到: ${zipPath}`);
          } catch (error) {
            console.error(`压缩工人打包数据时出错: ${error.message}`);
          }
        }
      } else {
        // 不使用压缩直接复制文件
        for (const file of files) {
          try {
            const srcPath = path.join(this.workerPackagesPath, file);
            const destPath = path.join(saveDir, file);

            if (fs.statSync(srcPath).isFile()) {
              fs.copyFileSync(srcPath, destPath);
            }
          } catch (error) {
            console.warn(`复制文件时出错 ${file}:`, error.message);
          }
        }
        console.log(`工人打包数据已保存到: ${saveDir}`);
      }
    } catch (error) {
      console.error('保存工人打包数据时出错:', error.message);
      // 可以在这里添加更完善的错误通知机制
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

      // 构建保存路径 - 使用专门的自动保存路径
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const saveDir = path.join(this.customerPackedPath, '..', 'backup', 'customer', timestamp);

      // 确保保存目录存在
      fs.mkdirSync(saveDir, { recursive: true });

      if (this.autoSaveConfig.compress) {
        // 使用压缩工具保存数据
        const filePaths = files
          .map(file => path.join(this.customerPackedPath, file))
          .filter(filePath => {
            try {
              return fs.statSync(filePath).isFile();
            } catch (error) {
              console.warn(`检查文件状态时出错 ${filePath}:`, error.message);
              return false;
            }
          });

        if (filePaths.length > 0) {
          const zipPath = path.join(saveDir, `customer-packed-${timestamp}.zip`);
          try {
            await FileCompressor.compressFilesToZip(filePaths, zipPath);
            console.log(`客户已打包数据已压缩保存到: ${zipPath}`);
          } catch (error) {
            console.error(`压缩客户已打包数据时出错: ${error.message}`);
          }
        }
      } else {
        // 不使用压缩直接复制文件
        for (const file of files) {
          try {
            const srcPath = path.join(this.customerPackedPath, file);
            const destPath = path.join(saveDir, file);

            if (fs.statSync(srcPath).isFile()) {
              fs.copyFileSync(srcPath, destPath);
            }
          } catch (error) {
            console.warn(`复制文件时出错 ${file}:`, error.message);
          }
        }
        console.log(`客户已打包数据已保存到: ${saveDir}`);
      }
    } catch (error) {
      console.error('保存客户已打包数据时出错:', error.message);
      // 可以在这里添加更完善的错误通知机制
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

    // 首次启动时立即执行一次保存操作
    console.log('执行初始保存操作...');
    this.saveWorkerPackagesData();
    this.saveCustomerPackedData();

    // 启动客户打包数据自动保存 - 使用专门的自动保存路径
    this.watcher = CustomerPackageUtils.startAutoSave(this.config);

    console.log(`自动保存监控已启动，模式: ${this.autoSaveConfig.saveMode}`);
  }

  /**
   * 停止自动保存监控
   */
  stopAutoSave() {
    if (this.watcher) {
      if (this.watcher.close) {
        // 文件监视器
        this.watcher.close();
      } else if (this.watcher.unref) {
        // 定时器
        clearInterval(this.watcher);
      }
      this.watcher = null;
      console.log('自动保存监控已停止');
    }
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

  // 监听退出信号，确保正确清理资源
  process.on('SIGINT', () => {
    console.log('接收到退出信号，正在停止自动保存监控...');
    autoSaveManager.stopAutoSave();
    process.exit(0);
  });
}

module.exports = AutoSaveManager;
