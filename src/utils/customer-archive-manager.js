const fs = require('fs').promises;
const fss = require('fs');
const path = require('path');
const zlib = require('zlib');
const { promisify } = require('util');
const archiver = require('archiver');
const unzipper = require('unzipper');
const config = require('../../config.json');
const DataManager = require('./data-manager');
const PackageDataExtractor = require('./package-data-extractor');
// 修复导入问题，正确导入getCustomerByName和updateCustomerStatus函数
const customerModel = require('../database/models/customer-fs');
const { CustomerStatus } = require('./status-manager');
const ExcelJS = require('exceljs'); // 添加Excel处理库

// 正确解构需要的函数
const { getCustomerByName, updateCustomerStatus } = customerModel;

const gzip = promisify(zlib.gzip);
const gunzip = promisify(zlib.gunzip);

// 定义归档数据文件路径
const archiveDataPath = path.join(__dirname, '../../data/archive.json');
const packageArchiveDataPath = path.join(__dirname, '../../data/package-archive.json');
const partArchiveDataPath = path.join(__dirname, '../../data/part-archive.json');

/**
 * 确保归档数据文件存在
 */
async function ensureArchiveFiles() {
  try {
    // 确保数据目录存在
    const dataDir = path.dirname(archiveDataPath);
    await fs.mkdir(dataDir, { recursive: true });

    // 初始化归档数据文件
    try {
      await fs.access(archiveDataPath);
    } catch {
      await fs.writeFile(archiveDataPath, JSON.stringify([]));
    }

    try {
      await fs.access(packageArchiveDataPath);
    } catch {
      await fs.writeFile(packageArchiveDataPath, JSON.stringify([]));
    }

    try {
      await fs.access(partArchiveDataPath);
    } catch {
      await fs.writeFile(partArchiveDataPath, JSON.stringify([]));
    }
  } catch (error) {
    console.error('初始化归档数据文件失败:', error);
    throw error;
  }
}

/**
 * 客户归档管理器
 * 负责客户数据的归档、查看和恢复功能
 */
class CustomerArchiveManager {
  /**
   * 归档客户数据
   * @param {string} customerName - 客户名称
   * @param {string} operator - 操作员
   * @param {string} remark - 备注
   * @returns {Promise} 归档结果
   */
  static async archiveCustomer(customerName, operator = 'system', remark = '') {
    try {
      // 确保归档数据文件存在
      await ensureArchiveFiles();

      // 获取客户信息
      const customer = await getCustomerByName(customerName);
      if (!customer) {
        return {
          success: false,
          message: `客户 ${customerName} 不存在`
        };
      }

      // 获取客户包数据
      const packagesData = await PackageDataExtractor.extractCustomerPackageData(
        path.join(customer.outputPath, 'packages.json')
      );

      // 生成备份文件名
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupFileName = `${customerName}_${timestamp}.zip`;
      const backupDir = path.join(__dirname, '../../data/backup');
      const backupPath = path.join(backupDir, backupFileName);

      // 确保备份目录存在
      await fs.mkdir(backupDir, { recursive: true });

      // 创建zip归档
      const output = fss.createWriteStream(backupPath);
      const archive = archiver('zip', {
        zlib: { level: 9 } // 设置压缩级别
      });

      archive.pipe(output);

      // 添加客户目录到归档
      archive.directory(customer.outputPath, customerName);

      // 完成归档
      await archive.finalize();

      // 读取现有归档数据
      const archiveData = await fs.readFile(archiveDataPath, 'utf8');
      const archives = JSON.parse(archiveData || '[]');

      // 生成新的归档ID
      const newId = archives.length > 0 ? Math.max(...archives.map(a => a.id)) + 1 : 1;

      // 创建归档记录
      const archiveRecord = {
        id: newId,
        customer_name: customerName,
        customer_address: customer.address || '',
        archive_date: new Date().toISOString(),
        backup_path: backupPath,
        packages_count: packagesData.length,
        total_parts_count: this.calculateTotalParts(packagesData),
        archive_user: operator,
        remark: remark
      };

      // 添加到归档列表
      archives.push(archiveRecord);
      await fs.writeFile(archiveDataPath, JSON.stringify(archives, null, 2));

      // 保存包数据
      const packageArchiveData = await fs.readFile(packageArchiveDataPath, 'utf8');
      let packageArchives = JSON.parse(packageArchiveData || '[]');

      // 保存部件数据
      const partArchiveData = await fs.readFile(partArchiveDataPath, 'utf8');
      let partArchives = JSON.parse(partArchiveData || '[]');

      // 为每个包创建记录
      packagesData.forEach((pkg, index) => {
        const packageId = packageArchives.length > 0 ? Math.max(...packageArchives.map(p => p.id)) + 1 : 1;
        const packageRecord = {
          id: packageId,
          archive_id: newId,
          pack_seq: pkg.packSeq,
          package_weight: pkg.packageInfo?.weight || 0,
          created_at: new Date().toISOString()
        };
        packageArchives.push(packageRecord);

        // 为每个部件创建记录
        if (pkg.partIDs && Array.isArray(pkg.partIDs)) {
          pkg.partIDs.forEach(partId => {
            const partIdNum = partArchives.length > 0 ? Math.max(...partArchives.map(p => p.id)) + 1 : 1;
            const partRecord = {
              id: partIdNum,
              package_id: packageId,
              part_id: partId,
              part_name: '', // 可以从其他地方获取部件名称
              part_quantity: 1 // 可以从其他地方获取部件数量
            };
            partArchives.push(partRecord);
          });
        }
      });

      // 保存包和部件数据
      await fs.writeFile(packageArchiveDataPath, JSON.stringify(packageArchives, null, 2));
      await fs.writeFile(partArchiveDataPath, JSON.stringify(partArchives, null, 2));

      // 更新客户状态
      await DataManager.updateCustomerStatus(customerName, CustomerStatus.ARCHIVED, '已归档', operator);

      // 模拟删除客户源文件夹（实际删除功能暂不启用）
      // 在真实环境中，这里应该使用 fs.rm 删除客户目录
      // await fs.rm(customer.outputPath, { recursive: true, force: true });
      console.log(`[模拟删除] 客户 ${customerName} 的源文件夹已标记为删除: ${customer.outputPath}`);
      console.log('[模拟删除] 实际删除操作已被禁用，以确保数据安全');

      return {
        success: true,
        archiveId: newId,
        message: `客户 ${customerName} 已成功归档，源文件夹已标记为删除（模拟模式）`
      };
    } catch (error) {
      console.error(`归档客户 ${customerName} 失败:`, error);
      return {
        success: false,
        message: `归档客户失败: ${error.message}`
      };
    }
  }

  /**
   * 计算总部件数
   * @param {Array} packages - 包数据
   * @returns {number} 总部件数
   */
  static calculateTotalParts(packages) {
    if (!packages || !Array.isArray(packages)) {
      return 0;
    }

    // 计算所有包含partIDs的包中部件的总数量
    let totalParts = 0;
    packages.forEach(pkg => {
      if (pkg.partIDs && Array.isArray(pkg.partIDs)) {
        totalParts += pkg.partIDs.length;
      }
    });

    return totalParts;
  }

  /**
   * 获取归档列表
   * @param {number} page - 页码
   * @param {number} pageSize - 每页数量
   * @returns {Promise} 归档列表
   */
  static async getArchiveList(page = 1, pageSize = 20) {
    try {
      // 确保归档数据文件存在
      await ensureArchiveFiles();

      // 确保page和pageSize是正整数
      const pageNum = Math.max(1, parseInt(page) || 1);
      const size = Math.max(1, parseInt(pageSize) || 20);

      // 读取归档数据
      const archiveData = await fs.readFile(archiveDataPath, 'utf8');
      let archives = JSON.parse(archiveData || '[]');

      // 按归档日期倒序排列
      archives.sort((a, b) => new Date(b.archive_date) - new Date(a.archive_date));

      // 计算分页
      const total = archives.length;
      const startIndex = (pageNum - 1) * size;
      const endIndex = Math.min(startIndex + size, total);
      const paginatedArchives = archives.slice(startIndex, endIndex);

      return {
        success: true,
        data: paginatedArchives,
        total,
        page: pageNum,
        pageSize: size
      };
    } catch (error) {
      console.error('获取归档列表失败:', error);
      return {
        success: false,
        message: '获取归档列表失败: ' + error.message
      };
    }
  }

  /**
   * 获取归档详情
   * @param {number} archiveId - 归档ID
   * @returns {Promise} 归档详情
   */
  static async getArchiveDetail(archiveId) {
    try {
      await ensureArchiveFiles();

      // 读取归档数据
      const archiveData = await fs.readFile(archiveDataPath, 'utf8');
      const archives = JSON.parse(archiveData || '[]');

      // 查找指定的归档记录
      const archive = archives.find(item => item.id == archiveId);
      if (!archive) {
        return {
          success: false,
          message: '归档记录不存在'
        };
      }

      // 读取包数据
      const packageData = await fs.readFile(packageArchiveDataPath, 'utf8');
      const packages = JSON.parse(packageData || '[]');

      // 读取部件数据
      const partData = await fs.readFile(partArchiveDataPath, 'utf8');
      const parts = JSON.parse(partData || '[]');

      // 关联包和部件数据
      const archivePackages = packages
        .filter(pkg => pkg.archive_id == archiveId)
        .map(pkg => {
          const packageParts = parts.filter(part => part.package_id == pkg.id);
          return {
            ...pkg,
            parts: packageParts
          };
        });

      // 构建完整的归档详情对象
      const archiveDetail = {
        ...archive,
        packages: archivePackages
      };

      return {
        success: true,
        data: archiveDetail
      };
    } catch (error) {
      console.error('获取归档详情失败:', error);
      return {
        success: false,
        message: '获取归档详情失败: ' + error.message
      };
    }
  }

  /**
   * 恢复归档数据
   * @param {number} archiveId - 归档ID
   * @returns {Promise} 恢复结果
   */
  static async restoreArchive(archiveId) {
    try {
      // 获取归档详情
      const detailResult = await this.getArchiveDetail(archiveId);
      if (!detailResult.success) {
        return detailResult;
      }

      const archive = detailResult.data;

      // 检查备份路径是否存在
      if (!archive.backup_path) {
        throw new Error('归档记录中缺少备份路径信息');
      }

      // 检查备份文件是否存在
      let backupFileExists = false;
      try {
        await fs.access(archive.backup_path);
        backupFileExists = true;
      } catch (error) {
        // 如果备份文件不存在，尝试在backup目录中查找同名客户文件
        const backupDir = path.join(__dirname, '../../data/backup');
        const customerName = archive.customer_name;

        try {
          const files = await fs.readdir(backupDir);
          const customerFiles = files.filter(file =>
            file.startsWith(customerName) && file.endsWith('.zip')
          ).sort(); // 按字母顺序排序，最新的文件在最后

          if (customerFiles.length > 0) {
            // 使用最新的备份文件
            const latestBackup = customerFiles[customerFiles.length - 1];
            archive.backup_path = path.join(backupDir, latestBackup);
            console.log(`找到客户"${customerName}"的备份文件: ${archive.backup_path}`);
            backupFileExists = true;
          } else {
            throw new Error(`在备份目录中未找到客户"${customerName}"的备份文件`);
          }
        } catch (dirError) {
          throw new Error(`备份文件不存在: ${archive.backup_path}`);
        }
      }

      // 验证备份文件是否为有效的ZIP文件
      if (backupFileExists) {
        try {
          // 尝试读取文件头来验证是否为ZIP文件
          const buffer = await fs.readFile(archive.backup_path);
          // ZIP文件头应该是 0x50 0x4B 0x03 0x04
          if (buffer.length < 4 || buffer[0] !== 0x50 || buffer[1] !== 0x4B || buffer[2] !== 0x03 || buffer[3] !== 0x04) {
            throw new Error('备份文件不是有效的ZIP文件');
          }
        } catch (validationError) {
          console.error('备份文件验证失败:', validationError);
          throw new Error(`备份文件验证失败: ${validationError.message}`);
        }
      }

      // 创建目标目录
      const customerDir = path.dirname(archive.backup_path).replace(/backup$/, 'customers');
      const targetDir = path.join(customerDir, archive.customer_name);
      await fs.mkdir(targetDir, { recursive: true });

      // 解压备份文件
      const zipPath = archive.backup_path;
      const extractPath = targetDir; // 修正解压路径
      console.log(`开始解压备份文件: ${zipPath} -> ${extractPath}`);

      // 使用unzipper解压文件
      await new Promise((resolve, reject) => {
        fss.createReadStream(zipPath)
          .pipe(unzipper.Extract({ path: extractPath }))
          .on('close', () => {
            console.log(`备份文件解压完成: ${zipPath} -> ${extractPath}`);
            resolve();
          })
          .on('error', (error) => {
            console.error('解压过程中发生错误:', error);
            reject(new Error(`解压文件失败: ${error.message}`));
          });
      });

      // 更新客户状态为已打包
      console.log(`更新客户 ${archive.customer_name} 状态为已打包`);
      await DataManager.updateCustomerStatus(archive.customer_name, '已打包', '从归档恢复', 'system');

      return {
        success: true,
        message: `归档 ${archive.customer_name} 已成功恢复到 ${targetDir}`
      };
    } catch (error) {
      console.error('恢复归档失败:', error);
      return {
        success: false,
        message: `恢复归档失败: ${error.message}`
      };
    }
  }

  /**
   * 导出归档数据到Excel
   * @param {number} archiveId - 归档ID
   * @returns {Promise} 导出结果
   */
  static async exportArchiveToExcel(archiveId) {
    try {
      // 获取归档详情
      const detailResult = await this.getArchiveDetail(archiveId);
      if (!detailResult.success) {
        return detailResult;
      }

      const archive = detailResult.data;

      // 创建导出目录
      const exportDir = path.join(__dirname, '../../data/export');
      await fs.mkdir(exportDir, { recursive: true });

      // 生成文件名
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const fileName = `归档_${archive.customer_name}_${timestamp}.xlsx`;
      const filePath = path.join(exportDir, fileName);

      // 创建工作簿
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('归档详情');

      // 添加表头
      worksheet.columns = [
        { header: '包序号', key: 'packSeq', width: 15 },
        { header: '板件ID', key: 'partId', width: 20 },
        { header: '板件名称', key: 'partName', width: 30 },
        { header: '数量', key: 'quantity', width: 10 }
      ];

      // 添加数据
      const rows = [];
      archive.packages.forEach(pkg => {
        if (pkg.parts && pkg.parts.length > 0) {
          pkg.parts.forEach(part => {
            rows.push({
              packSeq: pkg.pack_seq,
              partId: part.part_id,
              partName: part.part_name,
              quantity: part.part_quantity
            });
          });
        } else {
          // 如果包中没有部件，也要显示包信息
          rows.push({
            packSeq: pkg.pack_seq,
            partId: '',
            partName: '',
            quantity: ''
          });
        }
      });

      worksheet.addRows(rows);

      // 自动调整列宽
      worksheet.columns.forEach(column => {
        column.width = 20;
      });

      // 保存文件
      await workbook.xlsx.writeFile(filePath);

      return {
        success: true,
        filePath,
        message: `归档数据已成功导出到: ${filePath}`
      };
    } catch (error) {
      console.error('导出归档到Excel失败:', error);
      return {
        success: false,
        message: `导出归档到Excel失败: ${error.message}`
      };
    }
  }

  /**
   * 导出归档数据到PDF
   * @param {number} archiveId - 归档ID
   * @returns {Promise} 导出结果
   */
  static async exportArchiveToPDF(archiveId) {
    // PDF导出功能待实现
    return {
      success: false,
      message: 'PDF导出功能尚未实现'
    };
  }

  /**
   * 删除归档记录
   * @param {number} archiveId - 归档ID
   * @returns {Promise} 删除结果
   */
  static async deleteArchive(archiveId) {
    try {
      // 确保归档数据文件存在
      await ensureArchiveFiles();

      // 读取归档数据
      const archiveData = await fs.readFile(archiveDataPath, 'utf8');
      let archives = JSON.parse(archiveData || '[]');

      // 查找要删除的归档记录
      const archiveIndex = archives.findIndex(item => item.id == archiveId);
      if (archiveIndex === -1) {
        return {
          success: false,
          message: '归档记录不存在'
        };
      }

      // 获取归档记录
      const archive = archives[archiveIndex];

      // 从列表中移除归档记录
      archives.splice(archiveIndex, 1);
      await fs.writeFile(archiveDataPath, JSON.stringify(archives, null, 2));

      // 读取并更新包归档数据
      const packageArchiveData = await fs.readFile(packageArchiveDataPath, 'utf8');
      let packageArchives = JSON.parse(packageArchiveData || '[]');
      packageArchives = packageArchives.filter(pkg => pkg.archive_id != archiveId);
      await fs.writeFile(packageArchiveDataPath, JSON.stringify(packageArchives, null, 2));

      // 读取并更新部件归档数据
      const partArchiveData = await fs.readFile(partArchiveDataPath, 'utf8');
      let partArchives = JSON.parse(partArchiveData || '[]');

      // 找到要删除的包ID列表
      const packageIdsToDelete = packageArchives
        .filter(pkg => pkg.archive_id == archiveId)
        .map(pkg => pkg.id);

      // 删除相关的部件记录
      partArchives = partArchives.filter(part => !packageIdsToDelete.includes(part.package_id));
      await fs.writeFile(partArchiveDataPath, JSON.stringify(partArchives, null, 2));

      // 模拟删除备份文件（实际删除功能暂不启用）
      // 在真实环境中，这里应该使用 fs.unlink 删除备份文件
      // await fs.unlink(archive.backup_path).catch(() => {}); // 忽略文件不存在的错误
      console.log(`[模拟删除] 归档备份文件已标记为删除: ${archive.backup_path}`);
      console.log('[模拟删除] 实际删除操作已被禁用，以确保数据安全');

      return {
        success: true,
        message: `归档记录已删除，备份文件已标记为删除（模拟模式）`
      };
    } catch (error) {
      console.error('删除归档失败:', error);
      return {
        success: false,
        message: `删除归档失败: ${error.message}`
      };
    }
  }
}

// 为测试暴露私有函数
if (process.env.NODE_ENV === 'test') {
  CustomerArchiveManager._ensureArchiveFiles = ensureArchiveFiles;
}

// 将ensureArchiveFiles函数添加到导出对象中
CustomerArchiveManager.ensureArchiveFiles = ensureArchiveFiles;

module.exports = CustomerArchiveManager;













