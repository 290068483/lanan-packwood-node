const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

/**
 * 检查packages.json是否发生变化
 * @param {string} outputDir - 输出目录
 * @param {string} customerName - 客户名称
 * @returns {Promise<boolean>} - packages.json是否发生变化
 */
async function checkPackageChanged(outputDir, customerName) {
  try {
    // 检查本地packages.json文件是否存在，如果不存在则创建
    const localPackagePath = path.join(outputDir, 'packages.json');
    if (!fs.existsSync(localPackagePath)) {
      // 创建默认的packages.json文件
      const defaultPackage = {
        name: customerName.toLowerCase().replace(/\s+/g, '-'),
        version: '1.0.0',
        description: `Package file for ${customerName}`,
        private: true,
      };
      fs.writeFileSync(
        localPackagePath,
        JSON.stringify(defaultPackage, null, 2),
        'utf8'
      );
    }

    // 读取当前packages.json的内容
    const packageData = fs.readFileSync(localPackagePath, 'utf8');
    const currentPackageHash = crypto
      .createHash('md5')
      .update(packageData)
      .digest('hex');

    // 检查是否存在之前的packages.json哈希值文件
    const packageHashFilePath = path.join(outputDir, 'package.hash');
    if (fs.existsSync(packageHashFilePath)) {
      // 读取之前的哈希值
      const previousPackageHash = fs.readFileSync(packageHashFilePath, 'utf8');

      // 比较哈希值
      if (currentPackageHash === previousPackageHash) {
        return false;
      }
    }

    // 保存当前packages.json哈希值
    fs.writeFileSync(packageHashFilePath, currentPackageHash, 'utf8');
    return true;
  } catch (error) {
    // 出错时默认packages.json已变化
    return true;
  }
}

/**
 * 检查数据是否发生变化
 * @param {Array} cabinets - Cabinet数据数组
 * @param {string} outputDir - 输出目录
 * @param {string} customerName - 客户名称
 * @returns {Promise<boolean>} - 数据是否发生变化
 */
async function checkDataChanged(cabinets, outputDir, customerName) {
  try {
    // 生成当前数据的哈希值
    const currentDataHash = crypto
      .createHash('md5')
      .update(JSON.stringify(cabinets))
      .digest('hex');

    // 检查是否存在之前的哈希值文件
    const hashFilePath = path.join(outputDir, 'data.hash');
    if (fs.existsSync(hashFilePath)) {
      // 读取之前的哈希值
      const previousHash = fs.readFileSync(hashFilePath, 'utf8');

      // 比较哈希值
      if (currentDataHash === previousHash) {
        return false;
      }
    }

    // 保存当前哈希值
    fs.writeFileSync(hashFilePath, currentDataHash, 'utf8');
    return true;
  } catch (error) {
    // 出错时默认数据已变化
    return true;
  }
}

/**
 * 同步更新packages.json和data.hash文件
 * 确保当数据发生变化时，packages.json也同步更新，保持一致性
 * @param {Array} cabinets - Cabinet数据数组
 * @param {string} outputDir - 输出目录
 * @param {string} customerName - 客户名称
 * @returns {Promise<Object>} 包含数据和package是否发生变化的对象
 */
async function syncPackageAndData(cabinets, outputDir, customerName) {
  try {
    // 检查数据是否发生变化
    const dataChanged = await checkDataChanged(
      cabinets,
      outputDir,
      customerName
    );

    // 检查packages.json是否发生变化
    const packageChanged = await checkPackageChanged(outputDir, customerName);

    return {
      success: true,
      dataChanged,
      packageChanged,
    };
  } catch (error) {
    // 出错时默认都已变化
    return { 
      success: false, 
      message: error.message,
      dataChanged: true, 
      packageChanged: true 
    };
  }
}

function extractPanelIds(cabinets) {
  const ids = [];
  
  cabinets.forEach(cabinet => {
    if (cabinet && cabinet.Panels && cabinet.Panels.Panel) {
      const panels = Array.isArray(cabinet.Panels.Panel)
        ? cabinet.Panels.Panel
        : [cabinet.Panels.Panel];
        
      panels.forEach(panel => {
        if (panel['@_Uid']) {
          // 从右往左数5位作为ID号
          const uid = panel['@_Uid'];
          if (uid.length >= 5) {
            const idNumber = uid.substring(uid.length - 5, uid.length);
            ids.push(idNumber);
          } else {
            ids.push(uid);
          }
        }
      });
    }
  });
  
  return ids;
}

module.exports = { checkPackageChanged, checkDataChanged, syncPackageAndData };