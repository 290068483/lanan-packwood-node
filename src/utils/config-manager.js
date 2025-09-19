const fs = require('fs');
const path = require('path');

/**
 * 获取配置
 * @returns {Object} 配置对象
 */
function getConfig() {
  try {
    const configPath = path.join(__dirname, '../../config.json');
    if (fs.existsSync(configPath)) {
      const configContent = fs.readFileSync(configPath, 'utf8');
      return JSON.parse(configContent);
    } else {
      // 返回默认配置
      return {
        sourcePath: "//A6/蓝岸文件/1、客户总文件/3、生产/1、正单",
        localPath: "C:/Program Files (x86)/MPM/temp/local",
        networkPath: "//c1/mpm/temp/local/test",
        customerPackedPath: "D:/backup_data/backup/customer",
        workerPackagesPath: "D:/backup_data/backup/worker",
        autoSaveCustomerPath: "D:/backup_data/backup/customer",
        autoSaveWorkerPath: "D:/backup_data/backup/worker",
        autoSavePath: "C:\\Users\\Administrator\\Documents\\PackNodeAutoSaves"
      };
    }
  } catch (error) {
    console.error('读取配置文件出错:', error);
    // 返回默认配置
    return {
      sourcePath: "//A6/蓝岸文件/1、客户总文件/3、生产/1、正单",
      localPath: "C:/Program Files (x86)/MPM/temp/local",
      networkPath: "//c1/mpm/temp/local/test",
      customerPackedPath: "D:/backup_data/backup/customer",
      workerPackagesPath: "D:/backup_data/backup/worker",
      autoSaveCustomerPath: "D:/backup_data/backup/customer",
      autoSaveWorkerPath: "D:/backup_data/backup/worker",
      autoSavePath: "C:\\Users\\Administrator\\Documents\\PackNodeAutoSaves"
    };
  }
}

/**
 * 修复后的配置保存功能
 * 先读取现有配置，然后进行增量更新
 */
function saveConfigWithMerge(newConfig) {
  try {
    // 读取现有配置文件
    const configPath = path.join(__dirname, '../../config.json');

    // 读取现有配置
    let existingConfig = getConfig();

    // 合并配置 - 只更新提供的字段，保留其他现有字段
    const mergedConfig = { ...existingConfig, ...newConfig };

    // 确保必要的字段存在
    const requiredFields = [
      'sourcePath', 'localPath', 'networkPath',
      'customerPackedPath', 'workerPackagesPath',
      'autoSaveCustomerPath', 'autoSaveWorkerPath', 'autoSavePath'
    ];

    requiredFields.forEach(field => {
      if (!mergedConfig[field]) {
        console.warn(`⚠ 缺少必要字段 ${field}，使用默认值`);
        // 使用默认值
        switch(field) {
          case 'sourcePath':
            mergedConfig[field] = "//A6/蓝岸文件/1、客户总文件/3、生产/1、正单";
            break;
          case 'localPath':
            mergedConfig[field] = "C:/Program Files (x86)/MPM/temp/local";
            break;
          case 'networkPath':
            mergedConfig[field] = "//c1/mpm/temp/local/test";
            break;
          case 'customerPackedPath':
            mergedConfig[field] = "D:/backup_data/backup/customer";
            break;
          case 'workerPackagesPath':
            mergedConfig[field] = "D:/backup_data/backup/worker";
            break;
          case 'autoSaveCustomerPath':
            mergedConfig[field] = "D:/backup_data/backup/customer";
            break;
          case 'autoSaveWorkerPath':
            mergedConfig[field] = "D:/backup_data/backup/worker";
            break;
          case 'autoSavePath':
            mergedConfig[field] = "C:\\Users\\Administrator\\Documents\\PackNodeAutoSaves";
            break;
        }
      }
    });

    // 保存合并后的配置
    fs.writeFileSync(configPath, JSON.stringify(mergedConfig, null, 2), 'utf8');
    console.log('✅ 配置已成功保存（增量更新）');

    return { success: true, message: '配置已保存（增量更新）', config: mergedConfig };
  } catch (error) {
    console.error('✗ 保存配置失败:', error);
    return { success: false, error: `保存配置失败: ${error.message}` };
  }
}

module.exports = {
  getConfig,
  saveConfigWithMerge
};