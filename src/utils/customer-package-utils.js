const fs = require('fs');
const path = require('path');
const FileCompressor = require('./file-compressor');

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
    try {
      // 检查文件是否存在
      if (!fs.existsSync(packagesPath)) {
        console.log(`packages.json文件不存在: ${packagesPath}`);
        return [];
      }

      // 读取packages.json文件
      const packageData = fs.readFileSync(packagesPath, 'utf8');
      const packageJson = JSON.parse(packageData);

      // 如果是数组类型，表示是多个打包记录
      if (Array.isArray(packageJson)) {
        return packageJson;
      } 
      
      // 如果是对象类型，将其转换为数组格式
      if (packageJson && typeof packageJson === 'object') {
        // 检查是否有partIDs字段（客户打包数据）
        if (packageJson.partIDs && Array.isArray(packageJson.partIDs)) {
          return [{
            id: packageJson.name || 'default',
            partIDs: packageJson.partIDs,
            timestamp: packageJson.timestamp || Date.now()
          }];
        }
        
        // 检查是否有其他打包数据结构
        const result = [];
        for (const key in packageJson) {
          if (packageJson[key] && packageJson[key].partIDs && Array.isArray(packageJson[key].partIDs)) {
            result.push({
              id: key,
              partIDs: packageJson[key].partIDs,
              timestamp: packageJson[key].timestamp || Date.now()
            });
          }
        }
        
        return result;
      }
      
      return [];
    } catch (error) {
      console.error(`读取packages.json时发生错误: ${error.message}`);
      return [];
    }
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

    // 立即执行一次保存
    this.saveCustomerPackageData(
      path.join(config.workerPackagesPath.trim(), 'packages.json'),
      config.customerPackedPath.trim(),
      config.autoSave && config.autoSave.compress
    );

    // 设置定时器
    const interval = intervalMinutes * 60 * 1000; // 转换为毫秒
    const timer = setInterval(() => {
      this.saveCustomerPackageData(
        path.join(config.workerPackagesPath.trim(), 'packages.json'),
        config.customerPackedPath.trim(),
        config.autoSave && config.autoSave.compress
      );
    }, interval);

    console.log(`客户打包数据自动保存已启动，间隔: ${intervalMinutes} 分钟`);
    return timer;
  }
}

// 如果直接运行此文件，则启动定期保存
if (require.main === module) {
  // 加载配置文件
  const configPath = path.join(__dirname, '..', '..', 'config.json');
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  
  // 启动定期保存
  CustomerPackageUtils.startPeriodicSave(config, config.autoSave.intervalMinutes);
}

module.exports = CustomerPackageUtils;