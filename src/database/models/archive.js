/**
 * 归档数据模型
 */

const fs = require('fs');
const path = require('path');

// 数据文件路径
const dataDir = path.join(__dirname, '../../data');
const archiveDataPath = path.join(dataDir, 'archive.json');
const packageArchivePath = path.join(dataDir, 'package-archive.json');
const partArchivePath = path.join(dataDir, 'part-archive.json');

// 确保数据目录存在
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// 初始化数据文件
if (!fs.existsSync(archiveDataPath)) {
  fs.writeFileSync(archiveDataPath, JSON.stringify([]));
}
if (!fs.existsSync(packageArchivePath)) {
  fs.writeFileSync(packageArchivePath, JSON.stringify([]));
}
if (!fs.existsSync(partArchivePath)) {
  fs.writeFileSync(partArchivePath, JSON.stringify([]));
}

/**
 * 创建归档记录
 * @param {Object} archiveData - 归档数据
 * @returns {Promise<Object>} 创建的归档记录
 */
async function createArchive(archiveData) {
  return new Promise((resolve, reject) => {
    try {
      const {
        customerName,
        customerAddress = '',
        backupPath = '',
        packagesCount = 0,
        totalPartsCount = 0,
        archiveUser = 'system',
        remark = '',
        packages = []
      } = archiveData;

      // 读取现有数据
      const archives = JSON.parse(fs.readFileSync(archiveDataPath, 'utf8'));
      const packageArchives = JSON.parse(fs.readFileSync(packageArchivePath, 'utf8'));
      const partArchives = JSON.parse(fs.readFileSync(partArchivePath, 'utf8'));

      const now = new Date().toISOString();

      // 创建新归档记录
      const newArchive = {
        id: archives.length > 0 ? Math.max(...archives.map(a => a.id)) + 1 : 1,
        customerName,
        customerAddress,
        archiveDate: now,
        backupPath,
        packagesCount,
        totalPartsCount,
        archiveUser,
        remark,
        createdAt: now,
        updatedAt: now
      };

      archives.push(newArchive);

      // 添加包信息
      packages.forEach(pkg => {
        const newPackageArchive = {
          id: packageArchives.length > 0 ? Math.max(...packageArchives.map(p => p.id)) + 1 : 1,
          archiveId: newArchive.id,
          packSeq: pkg.packSeq || pkg.packID || '',
          packageWeight: pkg.packageInfo?.quantity || 0,
          packageVolume: 0, // 暂时设为0
          createdAt: now
        };

        packageArchives.push(newPackageArchive);

        // 添加板件信息
        if (pkg.partIDs && Array.isArray(pkg.partIDs)) {
          pkg.partIDs.forEach(partId => {
            const newPartArchive = {
              id: partArchives.length > 0 ? Math.max(...partArchives.map(p => p.id)) + 1 : 1,
              packageId: newPackageArchive.id,
              partId,
              partName: '',
              partQuantity: 1,
              createdAt: now
            };

            partArchives.push(newPartArchive);
          });
        }
      });

      // 保存数据
      fs.writeFileSync(archiveDataPath, JSON.stringify(archives, null, 2));
      fs.writeFileSync(packageArchivePath, JSON.stringify(packageArchives, null, 2));
      fs.writeFileSync(partArchivePath, JSON.stringify(partArchives, null, 2));

      // 返回新创建的归档记录
      getArchiveById(newArchive.id).then(resolve).catch(reject);
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * 根据ID获取归档记录
 * @param {number} id - 归档ID
 * @returns {Promise<Object>} 归档记录
 */
function getArchiveById(id) {
  return new Promise((resolve, reject) => {
    try {
      const archives = JSON.parse(fs.readFileSync(archiveDataPath, 'utf8'));
      const archive = archives.find(a => a.id === id);

      if (!archive) {
        resolve(null);
        return;
      }

      // 获取包信息
      const packageArchives = JSON.parse(fs.readFileSync(packageArchivePath, 'utf8'));
      const partArchives = JSON.parse(fs.readFileSync(partArchivePath, 'utf8'));

      const packages = packageArchives
        .filter(p => p.archiveId === id)
        .map(pkg => {
          const parts = partArchives
            .filter(p => p.packageId === pkg.id)
            .map(p => ({
              id: p.id,
              partId: p.partId,
              partName: p.partName,
              partQuantity: p.partQuantity
            }));

          return {
            id: pkg.id,
            packSeq: pkg.packSeq,
            packageWeight: pkg.packageWeight,
            packageVolume: pkg.packageVolume,
            createdAt: pkg.createdAt,
            parts
          };
        });

      resolve({
        ...archive,
        packages
      });
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * 获取所有归档记录
 * @returns {Promise<Array>} 归档记录列表
 */
async function getAllArchives() {
  return new Promise((resolve, reject) => {
    try {
      const archives = JSON.parse(fs.readFileSync(archiveDataPath, 'utf8'));
      const archivePromises = archives.map(a => getArchiveById(a.id));
      Promise.all(archivePromises)
        .then(archives => resolve(archives))
        .catch(reject);
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * 根据客户名称获取归档记录
 * @param {string} customerName - 客户名称
 * @returns {Promise<Array>} 归档记录列表
 */
async function getArchivesByCustomerName(customerName) {
  return new Promise((resolve, reject) => {
    try {
      const archives = JSON.parse(fs.readFileSync(archiveDataPath, 'utf8'));
      const customerArchives = archives.filter(a => a.customerName === customerName);

      const archivePromises = customerArchives.map(a => getArchiveById(a.id));
      Promise.all(archivePromises)
        .then(archives => resolve(archives))
        .catch(reject);
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * 获取归档列表（分页）
 * @param {number} page - 页码
 * @param {number} pageSize - 每页数量
 * @returns {Promise<Object>} 归档列表
 */
async function getArchiveList(page = 1, pageSize = 20) {
  return new Promise((resolve, reject) => {
    try {
      const archives = JSON.parse(fs.readFileSync(archiveDataPath, 'utf8'));
      const total = archives.length;
      const start = (page - 1) * pageSize;
      const end = start + pageSize;
      const paginatedArchives = archives.slice(start, end);

      const archivePromises = paginatedArchives.map(a => getArchiveById(a.id));
      Promise.all(archivePromises)
        .then(archives => {
          resolve({
            success: true,
            data: archives,
            total,
            page,
            pageSize
          });
        })
        .catch(reject);
    } catch (err) {
      reject(err);
    }
  });
}

module.exports = {
  createArchive,
  getArchiveById,
  getAllArchives,
  getArchivesByCustomerName,
  getArchiveList
};
