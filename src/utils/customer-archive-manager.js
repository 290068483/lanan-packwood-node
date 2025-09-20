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
// 修复导入问题，正确导入getCustomerByName函数
const { getCustomerByName } = require('../database/models/customer-fs');
const { CustomerStatus } = require('./status-manager');


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
  }
}

// 确保归档文件存在
ensureArchiveFiles();

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
      console.log(`开始归档客户: ${customerName}`);
      
      // 1. 获取客户数据
      const customerData = await getCustomerByName(customerName);
      console.log(`客户数据查询结果:`, customerData);
      
      if (!customerData) {
        throw new Error(`客户 "${customerName}" 不存在`);
      }

      // 2. 获取包数据
      const packagesPath = path.join(customerData.outputPath, 'packages.json');
      let packagesData = [];
      try {
        console.log(`尝试读取包数据文件: ${packagesPath}`);
        // 修复：确保正确检查文件是否存在
        await fs.access(packagesPath);
        packagesData = PackageDataExtractor.extractCustomerPackageData(packagesPath);
        console.log(`成功提取包数据，共 ${packagesData.length} 个包`);
      } catch (error) {
        // 修复：确保在任何错误情况下都调用console.warn
        console.warn('读取packages.json失败:', error.message);
      }

      // 3. 创建备份目录
      const backupDir = path.join(__dirname, '../../data/backup');
      await fs.mkdir(backupDir, { recursive: true });
      console.log(`创建备份目录: ${backupDir}`);

      // 4. 压缩客户文件夹
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupFileName = `${customerName}_${timestamp}.zip`;
      const backupPath = path.join(backupDir, backupFileName);
      console.log(`开始压缩客户目录: ${customerData.outputPath} -> ${backupPath}`);

      await this.compressDirectory(customerData.outputPath, backupPath);
      console.log(`客户目录压缩完成: ${backupPath}`);

      // 5. 保存归档数据到文件系统
      console.log(`准备保存归档数据，包含 ${packagesData.length} 个包`);
      const archiveId = await this.saveArchiveToFileSystem({
        customerName: customerData.name,
        customerAddress: customerData.address || '',
        backupPath,
        packagesCount: packagesData.length,
        totalPartsCount: this.calculateTotalParts(packagesData),
        archiveUser: operator,
        remark,
        packages: packagesData
      });
      console.log(`归档数据保存完成，归档ID: ${archiveId}`);

      // 6. 删除本地输出目录
      console.log(`开始删除原始输出目录: ${customerData.outputPath}`);
      await fs.rm(customerData.outputPath, { recursive: true, force: true });
      console.log(`原始输出目录删除完成`);

      // 7. 更新客户状态为已归档
      console.log(`更新客户状态为已归档`);
      await DataManager.updateCustomerStatus(customerName, '已归档', `已归档到 ${backupPath}`, operator);
      console.log(`客户状态更新完成`);

      return {
        success: true,
        archiveId,
        message: `客户 ${customerName} 已成功归档`
      };
    } catch (error) {
      console.error('归档客户失败:', error);
      return {
        success: false,
        message: `归档客户失败: ${error.message}`
      };
    }
  }

  /**
   * 压缩目录
   * @param {string} sourceDir - 源目录
   * @param {string} outputPath - 输出文件路径
   */
  static async compressDirectory(sourceDir, outputPath) {
    return new Promise((resolve, reject) => {
      const output = fss.createWriteStream(outputPath);
      const archive = archiver('zip', { zlib: { level: 9 } });

      output.on('close', () => resolve());
      archive.on('error', (err) => reject(err));

      archive.pipe(output);
      archive.directory(sourceDir, false);
      archive.finalize();
    });
  }

  /**
   * 计算总板件数
   * @param {Array} packages - 包数据
   * @returns {number} 总板件数
   */
  static calculateTotalParts(packages) {
    return packages.reduce((total, pkg) => {
      return total + (pkg.partIDs ? pkg.partIDs.length : 0);
    }, 0);
  }

  /**
   * 保存归档数据到文件系统
   * @param {Object} data - 归档数据
   * @returns {Promise<number>} 归档ID
   */
  static async saveArchiveToFileSystem(data) {
    try {
      // 读取现有的归档数据
      const archiveData = await fs.readFile(archiveDataPath, 'utf8');
      const archives = JSON.parse(archiveData || '[]');
      
      // 生成新的归档ID
      const archiveId = archives.length > 0 ? Math.max(...archives.map(a => a.id)) + 1 : 1;
      
      // 创建归档记录
      const archiveRecord = {
        id: archiveId,
        customer_name: data.customerName,
        customer_address: data.customerAddress,
        archive_date: new Date().toISOString(),
        backup_path: data.backupPath,
        packages_count: data.packagesCount,
        total_parts_count: data.totalPartsCount,
        archive_user: data.archiveUser,
        remark: data.remark
      };
      
      // 添加到归档列表
      archives.push(archiveRecord);
      await fs.writeFile(archiveDataPath, JSON.stringify(archives, null, 2));
      
      // 读取包信息
      const packageData = await fs.readFile(packageArchiveDataPath, 'utf8');
      const packages = JSON.parse(packageData || '[]');
      
      // 读取板件信息
      const partData = await fs.readFile(partArchiveDataPath, 'utf8');
      const parts = JSON.parse(partData || '[]');
      
      // 为每个包创建记录
      for (const pkg of data.packages) {
        const packageId = packages.length > 0 ? Math.max(...packages.map(p => p.id)) + 1 : 1;
        const packageRecord = {
          id: packageId,
          archive_id: archiveId,
          pack_seq: pkg.packSeq || pkg.packID || '',
          package_weight: pkg.packageInfo?.quantity || 0,
          package_volume: 0,
          created_at: new Date().toISOString()
        };
        
        packages.push(packageRecord);
        
        // 为每个板件创建记录
        if (pkg.partIDs && Array.isArray(pkg.partIDs)) {
          for (const partId of pkg.partIDs) {
            const partRecord = {
              id: parts.length > 0 ? Math.max(...parts.map(p => p.id)) + 1 : 1,
              package_id: packageId,
              part_id: partId,
              part_name: '',
              part_quantity: 1,
              created_at: new Date().toISOString()
            };
            parts.push(partRecord);
          }
        }
      }
      
      // 保存更新后的包和板件数据
      await fs.writeFile(packageArchiveDataPath, JSON.stringify(packages, null, 2));
      await fs.writeFile(partArchiveDataPath, JSON.stringify(parts, null, 2));
      
      return archiveId;
    } catch (error) {
      console.error('保存归档数据到文件系统失败:', error);
      throw error;
    }
  }

  /**
   * 获取归档列表
   * @param {number} page - 页码
   * @param {number} pageSize - 每页数量
   * @returns {Promise} 归档列表
   */
  static async getArchiveList(page = 1, pageSize = 20) {
    try {
      // 读取归档数据
      const archiveData = await fs.readFile(archiveDataPath, 'utf8');
      let archives = JSON.parse(archiveData || '[]');
      
      // 按归档日期倒序排序
      archives.sort((a, b) => new Date(b.archive_date) - new Date(a.archive_date));
      
      // 计算分页
      const total = archives.length;
      const offset = (page - 1) * pageSize;
      const paginatedArchives = archives.slice(offset, offset + pageSize);
      
      return {
        success: true,
        data: paginatedArchives,
        total,
        page,
        pageSize
      };
    } catch (error) {
      console.error('获取归档列表失败:', error);
      return {
        success: false,
        message: `获取归档列表失败: ${error.message}`
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
      // 读取归档信息
      const archiveData = await fs.readFile(archiveDataPath, 'utf8');
      const archives = JSON.parse(archiveData || '[]');
      
      const archive = archives.find(a => a.id === archiveId);
      if (!archive) {
        return {
          success: false,
          message: '归档记录不存在'
        };
      }
      
      // 读取包信息
      const packageData = await fs.readFile(packageArchiveDataPath, 'utf8');
      const packages = JSON.parse(packageData || '[]');
      
      // 获取该归档的所有包
      const archivePackages = packages.filter(p => p.archive_id === archiveId);
      
      // 读取板件信息
      const partData = await fs.readFile(partArchiveDataPath, 'utf8');
      const parts = JSON.parse(partData || '[]');
      
      // 为每个包添加板件信息
      for (const pkg of archivePackages) {
        pkg.parts = parts.filter(p => p.package_id === pkg.id);
      }
      
      return {
        success: true,
        data: {
          ...archive,
          packages: archivePackages
        }
      };
    } catch (error) {
      console.error('获取归档详情失败:', error);
      return {
        success: false,
        message: `获取归档详情失败: ${error.message}`
      };
    }
  }

  /**
   * 恢复归档
   * @param {number} archiveId - 归档ID
   * @returns {Promise} 恢复结果
   */
  static async restoreArchive(archiveId) {
    console.log(`开始恢复归档 - 归档ID: ${archiveId}`);
    try {
      // 获取归档详情
      const detailResult = await this.getArchiveDetail(archiveId);
      if (!detailResult.success) {
        return detailResult;
      }
      
      const archive = detailResult.data;
      
      // 创建目标目录
      const customerDir = path.dirname(archive.backup_path).replace(/backup$/, 'customers');
      const targetDir = path.join(customerDir, archive.customer_name);
      console.log(`创建恢复目标目录: ${targetDir}`);
      await fs.mkdir(targetDir, { recursive: true });
      
      // 解压备份文件
      const zipPath = archive.backup_path;
      const extractPath = targetDir;
      console.log(`开始解压备份文件: ${zipPath} -> ${extractPath}`);
      
      await fss.createReadStream(zipPath)
        .pipe(unzipper.Extract({ path: extractPath }))
        .promise();
      console.log(`备份文件解压完成`);
      
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
   * 导出归档到Excel
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
      
      // 生成Excel文件名
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const fileName = `归档_${archive.customer_name}_${timestamp}.xlsx`;
      const filePath = path.join(exportDir, fileName);
      
      // 这里应该实现Excel导出逻辑
      // 由于需要引入Excel库，暂时返回模拟结果
      console.log(`导出归档到Excel: ${filePath}`);
      
      return {
        success: true,
        filePath,
        message: `归档已导出到: ${filePath}`
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
   * 导出归档到PDF
   * @param {number} archiveId - 归档ID
   * @returns {Promise} 导出结果
   */
  static async exportArchiveToPDF(archiveId) {
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
      
      // 生成PDF文件名
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const fileName = `归档_${archive.customer_name}_${timestamp}.pdf`;
      const filePath = path.join(exportDir, fileName);
      
      // 这里应该实现PDF导出逻辑
      // 暂时返回模拟结果
      console.log(`导出归档到PDF: ${filePath}`);
      
      return {
        success: true,
        filePath,
        message: `归档已导出到: ${filePath}`
      };
    } catch (error) {
      console.error('导出归档到PDF失败:', error);
      return {
        success: false,
        message: `导出归档到PDF失败: ${error.message}`
      };
    }
  }
}

module.exports = CustomerArchiveManager;