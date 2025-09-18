const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { logInfo, logError, logWarning, logSuccess } = require('./logger');
const customerStatusManager = require('./customer-status-manager');
const PackageDataExtractor = require('./package-data-extractor');
const DataManager = require('./data-manager');

/**
 * 增强的文件监控器类
 * 用于监控packages.json文件变化并触发客户状态更新
 */
class EnhancedFileWatcher {
  /**
   * 构造函数
   * @param {Object} config - 配置对象
   */
  constructor(config) {
    this.config = config;
    this.workerPackagesPath = config.workerPackagesPath.trim();
    this.callbacks = [];
    this.watchers = [];
    this.intervalTimers = [];
    this.customerDataCache = new Map(); // 缓存客户数据
    this.isWatching = false;
  }

  /**
   * 添加客户数据到缓存
   * @param {string} customerName - 客户名称
   * @param {Object} customerData - 客户数据
   */
  addCustomerData(customerName, customerData) {
    this.customerDataCache.set(customerName, customerData);
  }

  /**
   * 添加回调函数
   * @param {Function} callback - 回调函数
   */
  addCallback(callback) {
    this.callbacks.push(callback);
  }

  /**
   * 触发所有回调函数
   * @param {string} filePath - 文件路径
   * @param {Object} changes - 变化详情
   */
  triggerCallbacks(filePath, changes) {
    this.callbacks.forEach(callback => {
      try {
        callback(filePath, changes);
      } catch (error) {
        console.error('执行回调函数时出错:', error);
      }
    });
  }

  /**
   * onChange模式 - 实时文件监控
   * @param {string} customerName - 客户名称（可选）
   */
  watchOnChange(customerName = null) {
    // 检查目录是否存在
    if (!fs.existsSync(this.workerPackagesPath)) {
      console.log(`目录不存在: ${this.workerPackagesPath}`);
      return null;
    }

    // 检查是否有顶层packages.json文件
    const topLevelPackagesPath = path.join(this.workerPackagesPath, 'packages.json');
    if (fs.existsSync(topLevelPackagesPath)) {
      console.log('直接监控顶层文件:', topLevelPackagesPath);

      // 从缓存获取客户数据
      let customerData = null;
      if (customerName && this.customerDataCache.has(customerName)) {
        customerData = this.customerDataCache.get(customerName);
      }

      // 保存当前文件内容和哈希
      let lastContent = fs.readFileSync(topLevelPackagesPath, 'utf8');
      let lastHash = crypto.createHash('md5').update(lastContent).digest('hex');

      // 启动文件监控
      const watcher = fs.watch(topLevelPackagesPath, async (eventType) => {
        if (eventType === 'change') {
          try {
            // 检查文件是否仍然存在
            if (!fs.existsSync(topLevelPackagesPath)) {
              return;
            }

            // 读取新内容
            const newContent = fs.readFileSync(topLevelPackagesPath, 'utf8');
            const newHash = crypto.createHash('md5').update(newContent).digest('hex');

            // 如果内容发生变化
            if (newHash !== lastHash) {
              console.log(`检测到 packages.json 内容变化`);

              // 更新最后内容和哈希
              lastContent = newContent;
              lastHash = newHash;

              // 分析变化
              const packagesData = PackageDataExtractor.extractCustomerPackageData(topLevelPackagesPath);
              const changes = customerStatusManager.checkPackStatus(customerData, packagesData);

              // 更新客户状态
              if (customerData) {
                const updatedData = customerStatusManager.updateCustomerStatus(customerData, changes, '系统', '检测到packages.json变化');

                // 保存更新后的数据
                DataManager.upsertCustomer(updatedData);

                // 更新缓存
                this.customerDataCache.set(customerName, updatedData);

                // 触发回调，传入变化详情
                this.triggerCallbacks(topLevelPackagesPath, {
                  ...changes,
                  customerName,
                  customerData: updatedData
                });
              }
            }
          } catch (error) {
            console.error('监控文件变化时发生错误:', error);
          }
        }
      });

      this.watchers.push(watcher);
    } else {
      // 如果没有顶层packages.json文件，则监控子目录中的文件
      let customerDirs = [];
      try {
        customerDirs = fs.readdirSync(this.workerPackagesPath)
          .filter(dir => {
            const fullPath = path.join(this.workerPackagesPath, dir);
            return fs.statSync(fullPath).isDirectory();
          });
      } catch (error) {
        console.log('读取客户目录出错:', error.message);
        return null;
      }

      // 如果指定了客户名称，过滤客户目录
      if (customerName) {
        customerDirs = customerDirs.filter(dir => dir.includes(customerName));
        console.log(`监控 ${customerDirs.length} 个匹配的客户目录`);
      } else {
        console.log(`监控 ${customerDirs.length} 个客户目录`);
      }

      // 为每个客户目录创建文件监视器
      customerDirs.forEach(dir => {
        const packagesPath = path.join(this.workerPackagesPath, dir, 'packages.json');

        // 检查文件是否存在
        if (!fs.existsSync(packagesPath)) {
          console.log(`文件不存在: ${packagesPath}`);
          return;
        }

        // 从缓存获取客户数据
        let customerData = null;
        const extractedCustomerName = this.extractCustomerName(packagesPath);
        if (extractedCustomerName && this.customerDataCache.has(extractedCustomerName)) {
          customerData = this.customerDataCache.get(extractedCustomerName);
        }

        // 保存当前文件内容和哈希
        let lastContent = fs.readFileSync(packagesPath, 'utf8');
        let lastHash = crypto.createHash('md5').update(lastContent).digest('hex');

        // 启动文件监控
        const watcher = fs.watch(packagesPath, async (eventType) => {
          if (eventType === 'change') {
            try {
              // 检查文件是否仍然存在
              if (!fs.existsSync(packagesPath)) {
                return;
              }

              // 读取新内容
              const newContent = fs.readFileSync(packagesPath, 'utf8');
              const newHash = crypto.createHash('md5').update(newContent).digest('hex');

              // 如果内容发生变化
              if (newHash !== lastHash) {
                console.log(`检测到 ${dir} 的packages.json内容变化`);

                // 更新最后内容和哈希
                lastContent = newContent;
                lastHash = newHash;

                // 分析变化
                const packagesData = PackageDataExtractor.extractCustomerPackageData(packagesPath);
                const changes = customerStatusManager.checkPackStatus(customerData, packagesData);

                // 更新客户状态
                if (customerData) {
                  const updatedData = customerStatusManager.updateCustomerStatus(customerData, changes, '系统', '检测到packages.json变化');

                  // 保存更新后的数据
                  DataManager.upsertCustomer(updatedData);

                  // 更新缓存
                  this.customerDataCache.set(extractedCustomerName, updatedData);

                  // 触发回调，传入变化详情
                  this.triggerCallbacks(packagesPath, {
                    ...changes,
                    customerName: extractedCustomerName,
                    customerData: updatedData
                  });
                }
              }
            } catch (error) {
              console.error('监控文件变化时发生错误:', error);
            }
          }
        });

        this.watchers.push(watcher);
      });
    }

    this.isWatching = true;
    console.log('文件监控已启动（onChange模式）');
    return this.watchers;
  }

  /**
   * onInterval模式 - 定时检查
   * @param {number} intervalMinutes - 检查间隔（分钟）
   * @param {string} customerName - 客户名称（可选）
   */
  watchOnInterval(intervalMinutes = 5, customerName = null) {
    // 检查目录是否存在
    if (!fs.existsSync(this.workerPackagesPath)) {
      console.log(`目录不存在: ${this.workerPackagesPath}`);
      return null;
    }

    const packagesPath = path.join(this.workerPackagesPath, 'packages.json');
    let customerDirs = [];

    // 如果有直接的packages.json文件
    if (fs.existsSync(packagesPath)) {
      // 立即执行一次检查
      this.triggerCallbacks(packagesPath, { immediateCheck: true });

      customerDirs = ['.']; // 虚拟目录
      console.log('监控单个 packages.json 文件');
    } else {
      // 读取目录中的所有子目录
      try {
        customerDirs = fs.readdirSync(this.workerPackagesPath)
          .filter(dir => {
            const fullPath = path.join(this.workerPackagesPath, dir);
            return fs.statSync(fullPath).isDirectory();
          });
      } catch (error) {
        console.log('读取客户目录出错:', error.message);
        return null;
      }

      // 如果指定了客户名称，过滤客户目录
      if (customerName) {
        customerDirs = customerDirs.filter(dir => dir.includes(customerName));
        console.log(`监控 ${customerDirs.length} 个匹配的客户目录`);
      }

      // 立即执行一次检查
      customerDirs.forEach(dir => {
        const packagesPath = path.join(this.workerPackagesPath, dir, 'packages.json');
        if (fs.existsSync(packagesPath)) {
          this.triggerCallbacks(packagesPath, { immediateCheck: true });
        }
      });
    }

    // 设置定时器
    const interval = intervalMinutes * 60 * 1000; // 转换为毫秒
    const intervalTimer = setInterval(() => {
      if (customerDirs.includes('.')) {
        // 监控单个文件
        if (fs.existsSync(packagesPath)) {
          this.triggerCallbacks(packagesPath, { scheduledCheck: true });
        }
      } else {
        // 监控多个目录
        customerDirs.forEach(dir => {
          const packagesPath = path.join(this.workerPackagesPath, dir, 'packages.json');
          if (fs.existsSync(packagesPath)) {
            this.triggerCallbacks(packagesPath, { scheduledCheck: true });
          }
        });
      }
    }, interval);

    this.intervalTimers.push(intervalTimer);
    this.isWatching = true;

    console.log(`文件监控已启动（onInterval模式），间隔: ${intervalMinutes} 分钟`);
    return this.intervalTimers;
  }

  /**
   * 启动文件监控
   * @param {string} mode - 监控模式（onChange/onInterval）
   * @param {number} intervalMinutes - 检查间隔（分钟，仅在onInterval模式下使用）
   * @param {string} customerName - 客户名称（可选）
   */
  start(mode = 'onChange', intervalMinutes = 5, customerName = null) {
    switch (mode) {
      case 'onChange':
        return this.watchOnChange(customerName);
      case 'onInterval':
        return this.watchOnInterval(intervalMinutes, customerName);
      default:
        throw new Error('无效的监控模式，支持的模式: onChange, onInterval');
    }
  }

  /**
   * 停止文件监控
   */
  stop() {
    // 关闭所有文件监视器
    this.watchers.forEach(watcher => {
      if (watcher && typeof watcher.close === 'function') {
        watcher.close();
      }
    });
    this.watchers = [];

    // 清除所有定时器
    this.intervalTimers.forEach(timer => {
      if (timer && typeof timer.unref === 'function') {
        clearInterval(timer);
      }
    });
    this.intervalTimers = [];

    this.isWatching = false;
    console.log('文件监控已停止');
  }

  /**
   * 从文件路径提取客户名称
   * @param {string} filePath - 文件路径
   * @returns {string} - 客户名称
   */
  extractCustomerName(filePath) {
    try {
      // 从路径中提取目录名
      const dirName = path.basename(path.dirname(filePath));

      // 处理 "YYMMDD 客户名称#" 格式
      const match = dirName.match(/\d{6}\s+(.+)#/);
      if (match) {
        return match[1];
      }

      // 默认返回目录名
      return dirName;
    } catch (error) {
      return '未知客户';
    }
  }

  /**
   * 检查是否正在监控
   * @returns {boolean} - 是否正在监控
   */
  isWatchingMode() {
    return this.isWatching;
  }
}

module.exports = EnhancedFileWatcher;