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
const { getCustomerByName, updateCustomerStatus } = require('../database/models/customer-fs');
const { CustomerStatus } = require('./status-manager');
const ExcelJS = require('exceljs'); // 添加Excel处理库


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
      try {
        await fs.access(archive.backup_path);
      } catch (error) {
        throw new Error(`备份文件不存在: ${archive.backup_path}`);
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
}

module.exports = CustomerArchiveManager;
