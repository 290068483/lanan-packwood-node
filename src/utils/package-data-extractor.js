const fs = require('fs');
const path = require('path');

/**
 * 客户打包数据提取器
 * 用于从packages.json文件中提取客户打包数据
 */
class PackageDataExtractor {
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
        return packageJson.map(item => this.processPackageItem(item, packagesPath));
      }

      // 如果是对象类型，转换为数组格式
      if (packageJson && typeof packageJson === 'object') {
        return [this.processPackageItem(packageJson, packagesPath)];
      }

      return [];
    } catch (error) {
      console.error(`读取packages.json时发生错误: ${error.message}`);
      return [];
    }
  }

  /**
   * 处理单个打包记录
   * @param {Object} item - 打包记录
   * @param {string} packagesPath - packages.json文件路径
   * @returns {Object} 处理后的打包记录
   */
  static processPackageItem(item, packagesPath) {
    // 从文件路径提取客户名称
    const customerName = this.extractCustomerName(packagesPath);

    return {
      customerName: customerName,
      packDate: item.packDate || '',
      packID: item.packID || '',
      packQty: item.packQty || 0,
      packUserName: item.packUserName || '',
      packState: item.packState || 0,
      partIDs: item.partIDs || [],
      partIdList: (item.partIDs || []).map(id =>
        id.substring(id.length - 5, id.length)),
      // 添加完整的包信息
      packageInfo: {
        id: item.packID || '',
        quantity: item.packQty || 0,
        state: item.packState || 0,
        userName: item.packUserName || '',
        date: item.packDate || ''
      },
      // 添加补件状态信息
      isReplacement: item.isReplacement || false,
      replacementStatus: item.replacementStatus || '未出货补件',
      // 添加时间戳
      timestamp: new Date().toISOString()
    };
  }

  /**
   * 从文件路径提取客户名称
   * @param {string} filePath - 文件路径
   * @returns {string} 客户名称
   */
  static extractCustomerName(filePath) {
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
}

module.exports = PackageDataExtractor;