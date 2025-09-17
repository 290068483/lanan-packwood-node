const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

/**
 * 文件监控器类
 * 用于监控packages.json文件变化并触发回调函数
 */
class FileWatcher {
  /**
   * 构造函数
   * @param {Object} config - 配置对象
   */
  constructor(config) {
    this.config = config;
    // 使用专门的自动保存路径，如果不存在则回退到通用路径
    this.workerPackagesPath = (config.autoSaveWorkerPath || config.workerPackagesPath).trim();
    this.callbacks = [];
    this.watchers = []; // 存储多个文件监视器
    this.intervalTimers = []; // 存储多个定时器
  }

  /**
   * 添加文件变化回调函数
   * @param {Function} callback - 回调函数
   */
  addCallback(callback) {
    this.callbacks.push(callback);
  }

  /**
   * 触发所有回调函数
   * @param {string} filePath - 文件路径
   */
  triggerCallbacks(filePath) {
    this.callbacks.forEach(callback => {
      try {
        callback(filePath);
      } catch (error) {
        console.error('执行回调函数时出错:', error);
      }
    });
  }

  /**
   * onChange模式 - 实时文件监控
   */
  watchOnChange() {
    // 检查目录是否存在
    if (!fs.existsSync(this.workerPackagesPath)) {
      console.log(`目录不存在: ${this.workerPackagesPath}`);
      return null;
    }

    // 检查是否有顶层packages.json文件
    const topLevelPackagesPath = path.join(this.workerPackagesPath, 'packages.json');
    if (fs.existsSync(topLevelPackagesPath)) {
      console.log('直接监控顶层文件:', topLevelPackagesPath);

      // 保存当前文件内容
      let lastContent = fs.readFileSync(topLevelPackagesPath, 'utf8');

      // 启动文件监控
      const watcher = fs.watch(topLevelPackagesPath, (eventType) => {
        if (eventType === 'change') {
          try {
            // 检查文件是否仍然存在
            if (!fs.existsSync(topLevelPackagesPath)) {
              return;
            }

            // 读取新内容
            const newContent = fs.readFileSync(topLevelPackagesPath, 'utf8');

            // 如果内容发生变化
            if (newContent !== lastContent) {
              console.log(`检测到 packages.json 内容变化`);
              // 更新最后内容
              lastContent = newContent;
              // 触发回调
              this.triggerCallbacks(topLevelPackagesPath);
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

      console.log(`监控 ${customerDirs.length} 个客户目录`);

      // 为每个客户目录创建文件监视器
      customerDirs.forEach(dir => {
        const packagesPath = path.join(this.workerPackagesPath, dir, 'packages.json');

        // 检查文件是否存在
        if (!fs.existsSync(packagesPath)) {
          console.log(`文件不存在: ${packagesPath}`);
          return;
        }

        // 保存当前文件内容
        let lastContent = fs.readFileSync(packagesPath, 'utf8');

        // 启动文件监控
        const watcher = fs.watch(packagesPath, (eventType) => {
          if (eventType === 'change') {
            try {
              // 检查文件是否仍然存在
              if (!fs.existsSync(packagesPath)) {
                return;
              }

              // 读取新内容
              const newContent = fs.readFileSync(packagesPath, 'utf8');

              // 如果内容发生变化
              if (newContent !== lastContent) {
                console.log(`检测到 ${dir} 的packages.json内容变化`);
                // 更新最后内容
                lastContent = newContent;
                // 触发回调
                this.triggerCallbacks(packagesPath);
              }
            } catch (error) {
              console.error('监控文件变化时发生错误:', error);
            }
          }
        });

        this.watchers.push(watcher);
      });
    }

    console.log('文件监控已启动（onChange模式）');
    return this.watchers;
  }

  /**
   * onInterval模式 - 定时检查
   * @param {number} intervalMinutes - 检查间隔（分钟）
   */
  watchOnInterval(intervalMinutes = 5) {
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
      this.triggerCallbacks(packagesPath);

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

      // 立即执行一次检查
      customerDirs.forEach(dir => {
        const packagesPath = path.join(this.workerPackagesPath, dir, 'packages.json');
        if (fs.existsSync(packagesPath)) {
          this.triggerCallbacks(packagesPath);
        }
      });
    }

    // 设置定时器
    const interval = intervalMinutes * 60 * 1000; // 转换为毫秒
    const intervalTimer = setInterval(() => {
      if (customerDirs.includes('.')) {
        // 监控单个文件
        if (fs.existsSync(packagesPath)) {
          this.triggerCallbacks(packagesPath);
        }
      } else {
        // 监控多个目录
        customerDirs.forEach(dir => {
          const packagesPath = path.join(this.workerPackagesPath, dir, 'packages.json');
          if (fs.existsSync(packagesPath)) {
            this.triggerCallbacks(packagesPath);
          }
        });
      }
    }, interval);

    this.intervalTimers.push(intervalTimer);

    console.log(`文件监控已启动（onInterval模式），间隔: ${intervalMinutes} 分钟`);
    return this.intervalTimers;
  }

  /**
   * 启动文件监控
   * @param {string} mode - 监控模式（onChange/onInterval）
   * @param {number} intervalMinutes - 检查间隔（分钟，仅在onInterval模式下使用）
   */
  start(mode = 'onChange', intervalMinutes = 5) {
    switch (mode) {
      case 'onChange':
        return this.watchOnChange();
      case 'onInterval':
        return this.watchOnInterval(intervalMinutes);
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

    console.log('文件监控已停止');
  }
}

module.exports = FileWatcher;
