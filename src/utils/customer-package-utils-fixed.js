const fs = require('fs');
const path = require('path');
const FileCompressor = require('./file-compressor');
const FileWatcher = require('./file-watcher');
const PackageDataExtractor = require('./package-data-extractor');

/**
 * 客户打包数据工具类
 */

class CustomerPackageUtils {
  /**
   * 从packages.json中提取客户打包数据
   * @param {string} packagesPath - packages.json文件路径
   * @returns {Array} 客户打包数据数组
   */
  static extractCustomerPackageData(packagesPath) {
    return PackageDataExtractor.extractCustomerPackageData(packagesPath);
  }

  /**
   * 保存客户打包数据到指定路径
   * @param {string} sourcePath - 源路径（packages.json路径）
   * @param {string} targetPath - 目标路径（客户已打包数据存储路径）
   * @param {boolean} compress - 是否压缩保存
   * @returns {Promise<Array>} 保存的文件路径数组
   */
  static async saveCustomerPackageData(sourcePath, targetPath, compress = true) {
    try {
      // 创建目标目录
      if (!fs.existsSync(targetPath)) {
        fs.mkdirSync(targetPath, { recursive: true });
      }

      // 生成时间戳
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

      // 构建保存路径
      const customerName = path.basename(path.dirname(sourcePath));
      const saveDir = path.join(targetPath, customerName, timestamp);
      if (!fs.existsSync(saveDir)) {
        fs.mkdirSync(saveDir, { recursive: true });
      }

      // 读取packages.json数据
      const customerPackages = this.extractCustomerPackageData(sourcePath);
      if (customerPackages.length === 0) {
        console.log(`没有可保存的客户打包数据: ${sourcePath}`);
        return [];
      }

      // 保存为JSON文件
      const savePath = path.join(saveDir, `customer-package-${timestamp}.json`);
      fs.writeFileSync(savePath, JSON.stringify(customerPackages, null, 2), 'utf8');
      console.log(`客户打包数据已保存到: ${savePath}`);

      // 如果启用压缩，创建ZIP文件
      let zipPath = null;
      if (compress) {
        zipPath = path.join(saveDir, `customer-package-${timestamp}.zip`);
        const filePaths = [savePath];
        await FileCompressor.compressFilesToZip(filePaths, zipPath);
        console.log(`客户打包数据已压缩保存到: ${zipPath}`);

        // 删除原始JSON文件
        fs.unlinkSync(savePath);
        return [zipPath];
      }

      return [savePath];
    } catch (error) {
      console.error(`保存客户打包数据时发生错误: ${error.message}`);
      return [];
    }
  }

  /**
   * 定期保存客户打包数据
   * @param {Object} config - 配置对象
   * @param {number} intervalMinutes - 保存间隔（分钟）
   * @returns {NodeJS.Timeout} 定时器对象
   */
  static startPeriodicSave(config, intervalMinutes = 5) {
    // 验证配置
    if (!config || !config.workerPackagesPath || !config.customerPackedPath) {
      throw new Error('配置对象必须包含workerPackagesPath和customerPackedPath');
    }

    // 使用专门的自动保存路径，如果不存在则回退到通用路径
    const workerPackagesPath = config.autoSaveWorkerPath || config.workerPackagesPath;
    const customerPackedPath = config.autoSaveCustomerPath || config.customerPackedPath;

    const packagesPath = path.join(workerPackagesPath, 'packages.json');

    // 立即执行一次保存
    this.saveCustomerPackageData(
      packagesPath,
      customerPackedPath,
      config.autoSave && config.autoSave.compress
    );

    // 设置定时器
    const interval = intervalMinutes * 60 * 1000; // 转换为毫秒
    const timer = setInterval(() => {
      this.saveCustomerPackageData(
        packagesPath,
        customerPackedPath,
        config.autoSave && config.autoSave.compress
      );
    }, interval);

    console.log(`客户打包数据自动保存已启动，间隔: ${intervalMinutes} 分钟`);
    return timer;
  }

  /**
   * 根据配置启动自动保存（支持保存模式切换）
   * @param {Object} config - 配置对象
   * @returns {NodeJS.Timeout|fs.FSWatcher} 定时器对象或文件监视器
   */
  static startAutoSave(config) {
    // 验证配置
    if (!config || !config.workerPackagesPath || !config.customerPackedPath) {
      throw new Error('配置对象必须包含workerPackagesPath和customerPackedPath');
    }

    // 使用专门的自动保存路径，如果不存在则回退到通用路径
    const workerPackagesPath = config.autoSaveWorkerPath || config.workerPackagesPath;
    const customerPackedPath = config.autoSaveCustomerPath || config.customerPackedPath;

    // 检查是否启用了自动保存
    if (!config.autoSave || !config.autoSave.enabled) {
      console.log('自动保存未启用');
      return null;
    }

    // 获取保存模式和相关配置
    const saveMode = config.autoSave.saveMode || 'onChange';
    const intervalMinutes = config.autoSave.intervalMinutes || 5;

    // 创建文件监控器 - 使用专门的自动保存路径
    const fileWatcher = new FileWatcher({
      ...config,
      workerPackagesPath: workerPackagesPath
    });

    // 添加回调函数 - 使用专门的自动保存路径
    fileWatcher.addCallback(async (filePath) => {
      try {
        await this.saveCustomerPackageData(
          filePath,
          customerPackedPath,
          config.autoSave && config.autoSave.compress
        );
      } catch (error) {
        console.error('保存客户打包数据时发生错误:', error);
      }
    });

    // 启动监控
    return fileWatcher.start(saveMode, intervalMinutes);
  }

  /**
   * 扫描并处理所有客户目录
   * @param {Object} config - 配置对象
   */
  static scanAndProcessAllCustomers(config) {
    try {
      // 使用专门的自动保存路径，如果不存在则回退到通用路径
      const workerPackagesPath = config.autoSaveWorkerPath || config.workerPackagesPath;
      const customerPackedPath = config.autoSaveCustomerPath || config.customerPackedPath;

      // 检查目录是否存在
      if (!fs.existsSync(workerPackagesPath)) {
        console.log(`工人打包数据目录不存在: ${workerPackagesPath}`);
        return;
      }

      // 检查是否有直接的packages.json文件
      const packagesPath = path.join(workerPackagesPath, 'packages.json');
      if (fs.existsSync(packagesPath)) {
        console.log('处理单个packages.json文件');
        this.saveCustomerPackageData(
          packagesPath,
          customerPackedPath,
          config.autoSave && config.autoSave.compress
        ).catch(error => {
          console.error('处理packages.json时发生错误:', error);
        });
        return;
      }

      // 读取目录中的所有子目录
      let customerDirs = [];
      try {
        customerDirs = fs.readdirSync(workerPackagesPath)
          .filter(dir => {
            const fullPath = path.join(workerPackagesPath, dir);
            return fs.statSync(fullPath).isDirectory();
          });
      } catch (error) {
        console.log('读取客户目录时出错:', error.message);
        return;
      }

      console.log(`发现 ${customerDirs.length} 个客户目录`);

      // 处理每个客户目录
      customerDirs.forEach(dir => {
        const packagesPath = path.join(workerPackagesPath, dir, 'packages.json');
        if (fs.existsSync(packagesPath)) {
          console.log(`处理客户目录: ${dir}`);
          this.saveCustomerPackageData(
            packagesPath,
            customerPackedPath,
            config.autoSave && config.autoSave.compress
          ).catch(error => {
            console.error(`处理客户 ${dir} 时发生错误:`, error);
          });
        } else {
          console.log(`客户目录 ${dir} 中未找到 packages.json 文件`);
        }
      });
    } catch (error) {
      console.error('扫描客户目录时发生错误:', error);
    }
  }
}

// 如果直接运行此文件，则启动自动保存
if (require.main === module) {
  // 加载配置文件
  const configPath = path.join(__dirname, '..', '..', 'config.json');
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

  // 启动自动保存
  CustomerPackageUtils.startAutoSave(config);
}

module.exports = CustomerPackageUtils;
