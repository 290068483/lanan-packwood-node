const fs = require('fs').promises;
const path = require('path');
const zlib = require('zlib');
const { promisify } = require('util');
const archiver = require('archiver');
const unzipper = require('unzipper');
const config = require('../../config.json');
const DataManager = require('./data-manager');
const PackageDataExtractor = require('./package-data-extractor');
const Database = require('../database/connection');
const { CustomerStatus } = require('./status-manager');

const gzip = promisify(zlib.gzip);
const gunzip = promisify(zlib.gunzip);

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
      // 1. 获取客户数据
      const customerData = await DataManager.getCustomer(customerName);
      if (!customerData) {
        throw new Error('客户不存在');
      }

      // 2. 获取包数据
      const packagesPath = path.join(customerData.outputPath, 'packages.json');
      let packagesData = [];
      if (fs.existsSync(packagesPath)) {
        packagesData = PackageDataExtractor.extractCustomerPackageData(packagesPath);
      }

      // 3. 创建备份目录
      const backupDir = path.join('D:\backup_data\backup\customer');
      await fs.mkdir(backupDir, { recursive: true });

      // 4. 压缩客户文件夹
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupFileName = `${customerName}_${timestamp}.zip`;
      const backupPath = path.join(backupDir, backupFileName);

      await this.compressDirectory(customerData.outputPath, backupPath);

      // 5. 保存归档数据到数据库
      const archiveId = await this.saveArchiveToDatabase({
        customerName: customerData.name,
        customerAddress: customerData.address || '',
        backupPath,
        packagesCount: packagesData.length,
        totalPartsCount: this.calculateTotalParts(packagesData),
        archiveUser: operator,
        remark,
        packages: packagesData
      });

      // 6. 删除本地输出目录
      await fs.rm(customerData.outputPath, { recursive: true, force: true });

      // 7. 更新客户状态为已归档
      await this.updateCustomerStatus(customerName, '已归档', `已归档到 ${backupPath}`, operator);

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
      const output = fs.createWriteStream(outputPath);
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
   * 保存归档数据到数据库
   * @param {Object} data - 归档数据
   * @returns {Promise<number} 归档ID
   */
  static async saveArchiveToDatabase(data) {
    const db = Database.getInstance();
    const connection = await db.getConnection();

    try {
      await connection.beginTransaction();

      // 插入客户归档记录
      const [archiveResult] = await connection.query(
        'INSERT INTO customer_archive ' +
        '(customer_name, customer_address, archive_date, backup_path, packages_count, total_parts_count, archive_user, remark) ' +
        'VALUES (?, ?, NOW(), ?, ?, ?, ?, ?)',
        [data.customerName, data.customerAddress, data.backupPath, data.packagesCount, data.totalPartsCount, data.archiveUser, data.remark]
      );

      const archiveId = archiveResult.insertId;

      // 插入包信息
      for (const pkg of data.packages) {
        const [packageResult] = await connection.query(
          'INSERT INTO package_archive ' +
          '(archive_id, pack_seq, package_weight, package_volume, created_at) ' +
          'VALUES (?, ?, ?, ?, NOW())',
          [archiveId, pkg.packSeq || pkg.packID || '', pkg.packageInfo?.quantity || 0, 0] // 暂时使用包数量作为重量
        );

        const packageId = packageResult.insertId;

        // 插入板件ID信息
        if (pkg.partIDs && Array.isArray(pkg.partIDs)) {
          for (const partId of pkg.partIDs) {
            await connection.query(
              'INSERT INTO part_archive (package_id, part_id, part_name, part_quantity, created_at) ' +
              'VALUES (?, ?, ?, ?, NOW())',
              [packageId, partId, '', 1]
            );
          }
        }
      }

      await connection.commit();
      return archiveId;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * 获取归档列表
   * @param {number} page - 页码
   * @param {number} pageSize - 每页数量
   * @returns {Promise} 归档列表
   */
  static async getArchiveList(page = 1, pageSize = 20) {
    const db = Database.getInstance();
    const offset = (page - 1) * pageSize;

    try {
      // 查询归档列表
      const [archives] = await db.query(
        'SELECT * FROM customer_archive ' +
        'ORDER BY archive_date DESC ' +
        'LIMIT ? OFFSET ?',
        [pageSize, offset]
      );

      // 查询总数
      const [countResult] = await db.query(
        'SELECT COUNT(*) as total FROM customer_archive'
      );

      return {
        success: true,
        data: archives,
        total: countResult[0].total,
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
    const db = Database.getInstance();

    try {
      // 查询归档信息
      const [archives] = await db.query(
        'SELECT * FROM customer_archive WHERE id = ?',
        [archiveId]
      );

      if (!archives || archives.length === 0) {
        return {
          success: false,
          message: '归档记录不存在'
        };
      }

      const archive = archives[0];

      // 查询包信息
      const [packages] = await db.query(
        'SELECT * FROM package_archive WHERE archive_id = ?',
        [archiveId]
      );

      // 为每个包查询板件信息
      for (const pkg of packages) {
        const [parts] = await db.query(
          'SELECT * FROM part_archive WHERE package_id = ?',
          [pkg.id]
        );
        pkg.parts = parts;
      }

      return {
        success: true,
        data: {
          ...archive,
          packages
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
   * @param {string} operator - 操作员
   * @returns {Promise} 恢复结果
   */
  static async restoreArchive(archiveId, operator = 'system') {
    const db = Database.getInstance();

    try {
      // 获取归档信息
      const archiveResult = await this.getArchiveDetail(archiveId);
      if (!archiveResult.success) {
        return archiveResult;
      }

      const archive = archiveResult.data;

      // 创建输出目录
      const outputDir = path.join(config.outputPath, archive.customer_name);
      await fs.mkdir(outputDir, { recursive: true });

      // 解压备份文件
      const backupPath = archive.backup_path;
      if (!fs.existsSync(backupPath)) {
        throw new Error('备份文件不存在');
      }

      await this.extractArchive(backupPath, outputDir);

      // 恢复客户状态
      await this.updateCustomerStatus(
        archive.customer_name, 
        '已打包', 
        '从归档恢复，原归档ID: ' + archiveId, 
        operator
      );
    } catch (error) {
      console.error('✗ 归档恢复失败:', error);
      return {
        success: false,
        message: '归档恢复失败: ' + error.message
      };
    }
  }
}

module.exports = CustomerArchiveManager;
