const fs = require('fs');
const path = require('path');
const FileCompressor = require('./file-compressor');
const CustomerPackageUtils = require('./customer-package-utils');

/**
 * 自动保存管理器
 * 管理工人打包数据和客户已打包数据的自动保存
 * 数据将保存到按日期和客户名称组织的文件夹中
 */
class AutoSaveManager {
  /**
   * 构造函数
   * @param {Object} config - 配置对象
   */
  constructor(config) {
    this.config = config;
    this.workerPackagesPath = config.workerPackagesPath.trim();
    this.customerPackedPath = config.customerPackedPath.trim();
    this.autoSaveCustomerPath = config.autoSaveCustomerPath.trim();
    this.autoSaveWorkerPath = config.autoSaveWorkerPath.trim();
    this.autoSaveConfig = config.autoSave || { enabled: false };
    this.watcher = null;
  }

  /**
   * 获取按日期和客户名称组织的保存路径
   * @param {string} basePath - 基础路径
   * @param {string} customerName - 客户名称
   * @returns {string} 完整的保存路径
   */
  getAutoSavePath(basePath, customerName) {
    // 获取当前日期 (YYYY-MM-DD格式)
    const currentDate = new Date();
    const dateStr = currentDate.toISOString().slice(0, 10);

    // 创建路径: basePath/YYYY-MM-DD/客户名称/
    const dateDir = path.join(basePath, dateStr);
    const customerDir = path.join(dateDir, customerName);

    // 确保目录存在
    if (!fs.existsSync(customerDir)) {
      fs.mkdirSync(customerDir, { recursive: true });
      console.log(`✅ 已创建自动保存目录: ${customerDir}`);
    }

    return customerDir;
  }

  /**
   * 保存工人打包数据
   * @param {string} customerName - 客户名称
   */
  async saveWorkerPackagesData(customerName = '未知客户') {
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

      // 构建保存路径 - 使用按日期和客户名称组织的路径
      const saveDir = this.getAutoSavePath(this.autoSaveWorkerPath, customerName);

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
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
          const zipPath = path.join(saveDir, `worker-packages-${customerName}-${timestamp}.zip`);
          try {
            await FileCompressor.compressFilesToZip(filePaths, zipPath);
            console.log(`✅ 工人打包数据已压缩保存到: ${zipPath}`);
          } catch (error) {
            console.error(`✗ 压缩工人打包数据时出错: ${error.message}`);
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
            console.warn(`✗ 复制文件时出错 ${file}:`, error.message);
          }
        }
        console.log(`✅ 工人打包数据已保存到: ${saveDir}`);
      }
    } catch (error) {
      console.error('✗ 保存工人打包数据时出错:', error.message);
    }
  }

  /**
   * 保存客户已打包数据
   * @param {string} customerName - 客户名称
   */
  async saveCustomerPackedData(customerName = '未知客户') {
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

      // 构建保存路径 - 使用按日期和客户名称组织的路径
      const saveDir = this.getAutoSavePath(this.autoSaveCustomerPath, customerName);

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
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
          const zipPath = path.join(saveDir, `customer-packed-${customerName}-${timestamp}.zip`);
          try {
            await FileCompressor.compressFilesToZip(filePaths, zipPath);
            console.log(`✅ 客户已打包数据已压缩保存到: ${zipPath}`);
          } catch (error) {
            console.error(`✗ 压缩客户已打包数据时出错: ${error.message}`);
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
            console.warn(`✗ 复制文件时出错 ${file}:`, error.message);
          }
        }
        console.log(`✅ 客户已打包数据已保存到: ${saveDir}`);
      }
    } catch (error) {
      console.error('✗ 保存客户已打包数据时出错:', error.message);
    }
  }

  /**
   * 启动自动保存监控
   * @param {string} customerName - 客户名称
   */
  startAutoSave(customerName = '未知客户') {
    if (!this.autoSaveConfig.enabled) {
      console.log('自动保存未启用');
      return;
    }

    // 首次启动时立即执行一次保存操作
    console.log('执行初始保存操作...');
    this.saveWorkerPackagesData(customerName);
    this.saveCustomerPackedData(customerName);

    // 启动客户打包数据自动保存
    this.watcher = CustomerPackageUtils.startAutoSave(this.config, customerName);

    console.log(`✅ 自动保存监控已启动，模式: ${this.autoSaveConfig.saveMode || '定时'}`);
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
      console.log('✅ 自动保存监控已停止');
    }
  }

  /**
   * 查看自动保存数据
   * @param {string} basePath - 基础保存路径
   * @param {string} customerName - 客户名称 (可选)
   * @returns {Promise<Object>} 查看结果
   */
  async viewAutoSaveData(basePath, customerName) {
    try {
      let targetPath = basePath;

      // 如果指定了客户名称，查找最近的日期文件夹
      if (customerName) {
        // 获取所有日期文件夹
        const dateDirs = fs.readdirSync(basePath)
          .filter(dir => /^\d{4}-\d{2}-\d{2}$/.test(dir))
          .map(dir => path.join(basePath, dir))
          .filter(dir => fs.statSync(dir).isDirectory());

        if (dateDirs.length === 0) {
          return { success: false, error: '未找到任何日期文件夹' };
        }

        // 按修改时间排序，最新的在前
        dateDirs.sort((a, b) => {
          return fs.statSync(b).mtime - fs.statSync(a).mtime;
        });

        // 获取最新的日期文件夹
        const latestDateDir = path.basename(dateDirs[0]);
        targetPath = path.join(basePath, latestDateDir, customerName);
      }

      // 检查路径是否存在
      if (!fs.existsSync(targetPath)) {
        return { success: false, error: '路径不存在: ' + targetPath };
      }

      // 打开该路径
      const { exec } = require('child_process');
      exec(`start "" "${targetPath}"`, (error) => {
        if (error) {
          console.error('打开目录失败:', error);
          return { success: false, error: error.message };
        }
        console.log(`✅ 已打开目录: ${targetPath}`);
      });

      return { success: true, path: targetPath };
    } catch (error) {
      console.error(`✗ 查看自动保存数据失败: ${error.message}`);
      return { success: false, error: error.message };
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