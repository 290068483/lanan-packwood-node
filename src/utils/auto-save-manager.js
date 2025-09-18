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
   * @param {string} customerName - 客户名称（可选）
   */
  async saveWorkerPackagesData(customerName = null) {
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

      // 如果指定了客户名称，则只处理该客户的文件
      if (customerName) {
        // 查找匹配客户名称的目录
        const customerDirs = fs.readdirSync(this.workerPackagesPath)
          .filter(dir => {
            const fullPath = path.join(this.workerPackagesPath, dir);
            return fs.statSync(fullPath).isDirectory() && dir.includes(customerName);
          });

        if (customerDirs.length === 0) {
          console.log(`未找到客户 "${customerName}" 的目录`);
          return;
        }

        // 处理每个匹配的客户目录
        for (const customerDir of customerDirs) {
          const customerPath = path.join(this.workerPackagesPath, customerDir);
          const files = fs.readdirSync(customerPath);
          if (files.length === 0) {
            console.log(`客户 "${customerName}" 的打包数据目录为空`);
            continue;
          }

          // 构建保存路径 - 使用按日期和客户名称组织的路径
          const saveDir = this.getAutoSavePath(this.autoSaveWorkerPath, customerName);

          if (this.autoSaveConfig.compress) {
            // 使用压缩工具保存数据
            const filePaths = files
              .map(file => path.join(customerPath, file))
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
                const srcPath = path.join(customerPath, file);
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
        }
      } else {
        // 如果没有指定客户名称，保持原有的行为（处理所有文件）
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
      }
    } catch (error) {
      console.error('保存工人打包数据时出错:', error.message);
      // 可以在这里添加更完善的错误通知机制
    }
  }

  /**
   * 保存客户已打包数据
   * @param {string} customerName - 客户名称（可选）
   */
  async saveCustomerPackedData(customerName = null) {
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

      // 如果指定了客户名称，则只处理该客户的文件
      if (customerName) {
        // 查找匹配客户名称的目录
        const customerDirs = fs.readdirSync(this.customerPackedPath)
          .filter(dir => {
            const fullPath = path.join(this.customerPackedPath, dir);
            return fs.statSync(fullPath).isDirectory() && dir.includes(customerName);
          });

        if (customerDirs.length === 0) {
          console.log(`未找到客户 "${customerName}" 的已打包数据目录`);
          return;
        }

        // 处理每个匹配的客户目录
        for (const customerDir of customerDirs) {
          const customerPath = path.join(this.customerPackedPath, customerDir);
          const files = fs.readdirSync(customerPath);
          if (files.length === 0) {
            console.log(`客户 "${customerName}" 的已打包数据目录为空`);
            continue;
          }

          // 构建保存路径 - 使用按日期和客户名称组织的路径
          const saveDir = this.getAutoSavePath(this.autoSaveCustomerPath, customerName);

          if (this.autoSaveConfig.compress) {
            // 使用压缩工具保存数据
            const filePaths = files
              .map(file => path.join(customerPath, file))
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
                const srcPath = path.join(customerPath, file);
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
        }
      } else {
        // 如果没有指定客户名称，保持原有的行为（处理所有文件）
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
      }
    } catch (error) {
      console.error('保存客户已打包数据时出错:', error.message);
      // 可以在这里添加更完善的错误通知机制
    }
  }

  /**
   * 启动自动保存监控
   * @param {string} customerName - 客户名称（可选）
   */
  startAutoSave(customerName = null) {
    if (!this.autoSaveConfig.enabled) {
      console.log('自动保存未启用');
      return;
    }

    // 首次启动时立即执行一次保存操作
    console.log('执行初始保存操作...');
    this.saveWorkerPackagesData(customerName);
    this.saveCustomerPackedData(customerName);

    // 启动客户打包数据自动保存
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