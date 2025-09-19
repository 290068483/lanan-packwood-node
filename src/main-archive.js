const { ipcMain } = require('electron');
const CustomerArchiveManager = require('./utils/customer-archive-manager');
const Database = require('./database/database');
const path = require('path');
const fs = require('fs').promises;
const config = require('./config.json');

/**
 * 初始化归档相关IPC处理程序
 * @param {Electron.BrowserWindow} mainWindow - 主窗口实例
 */
function initArchiveHandlers(mainWindow) {
  // 客户归档相关处理程序
  ipcMain.handle(
    'archive-customer',
    async (event, customerName, operator = 'system', remark = '') => {
      try {
        const result = await CustomerArchiveManager.archiveCustomer(
          customerName,
          operator,
          remark
        );

        if (result.success) {
          // 归档成功后刷新客户列表
          if (mainWindow) {
            mainWindow.webContents.send('archive-success', {
              customerName,
              archiveId: result.archiveId,
            });
          }
        }

        return result;
      } catch (error) {
        console.error('归档客户失败:', error);
        return { success: false, message: `归档客户失败: ${error.message}` };
      }
    }
  );

  // 获取归档列表
  ipcMain.handle('get-archive-list', async (event, page = 1, pageSize = 20) => {
    try {
      return await CustomerArchiveManager.getArchiveList(page, pageSize);
    } catch (error) {
      console.error('获取归档列表失败:', error);
      return { success: false, message: `获取归档列表失败: ${error.message}` };
    }
  });

  // 获取归档详情
  ipcMain.handle('get-archive-detail', async (event, archiveId) => {
    try {
      return await CustomerArchiveManager.getArchiveDetail(archiveId);
    } catch (error) {
      console.error('获取归档详情失败:', error);
      return { success: false, message: `获取归档详情失败: ${error.message}` };
    }
  });

  // 恢复归档
  ipcMain.handle(
    'restore-archive',
    async (event, archiveId, operator = 'system') => {
      try {
        const result = await CustomerArchiveManager.restoreArchive(
          archiveId,
          operator
        );

        if (result.success) {
          // 恢复成功后刷新客户列表
          if (mainWindow) {
            mainWindow.webContents.send('restore-success', {
              customerName: result.customerName,
              archiveId,
            });
          }
        }

        return result;
      } catch (error) {
        console.error('恢复归档失败:', error);
        return { success: false, message: `恢复归档失败: ${error.message}` };
      }
    }
  );

  // 搜索归档
  ipcMain.handle('search-archives', async (event, criteria) => {
    try {
      const { customerName, startDate, endDate, operator } = criteria;
      const db = Database.getInstance();
      const archiveModels = db.getArchiveModels();

      // 先获取所有归档
      const result = await archiveModels.getArchiveList(1, 1000);
      if (!result.success) {
        return result;
      }

      // 过滤归档数据
      let filteredArchives = result.data;

      if (customerName) {
        filteredArchives = filteredArchives.filter(
          archive => archive.customer_name.includes(customerName)
        );
      }

      if (startDate) {
        filteredArchives = filteredArchives.filter(
          archive => new Date(archive.archive_date) >= new Date(startDate)
        );
      }

      if (endDate) {
        filteredArchives = filteredArchives.filter(
          archive => new Date(archive.archive_date) <= new Date(endDate)
        );
      }

      if (operator) {
        filteredArchives = filteredArchives.filter(
          archive => archive.archive_user === operator
        );
      }

      return {
        success: true,
        data: filteredArchives,
        total: filteredArchives.length,
        page: 1,
        pageSize: filteredArchives.length
      };
    } catch (error) {
      console.error('搜索归档失败:', error);
      return { success: false, message: `搜索归档失败: ${error.message}` };
    }
  });

  // 导出归档数据到Excel
  ipcMain.handle('export-archive-to-excel', async (event, archiveId) => {
    try {
      const result = await CustomerArchiveManager.getArchiveDetail(archiveId);
      if (!result.success) {
        return result;
      }

      const archive = result.data;
      const ExcelJS = require('exceljs');
      const workbook = new ExcelJS.Workbook();

      // 创建客户基本信息工作表
      const customerSheet = workbook.addWorksheet('客户信息');
      customerSheet.columns = [
        { header: '字段', key: 'field' },
        { header: '值', key: 'value' }
      ];

      customerSheet.addRow({ field: '客户名称', value: archive.customer_name });
      customerSheet.addRow({ field: '客户地址', value: archive.customer_address || '' });
      customerSheet.addRow({ field: '归档日期', value: archive.archive_date });
      customerSheet.addRow({ field: '归档操作员', value: archive.archive_user });
      customerSheet.addRow({ field: '包数量', value: archive.packages_count || 0 });
      customerSheet.addRow({ field: '板件总数', value: archive.total_parts_count || 0 });
      customerSheet.addRow({ field: '备注', value: archive.remark || '' });

      // 创建包信息工作表
      const packageSheet = workbook.addWorksheet('包信息');
      packageSheet.columns = [
        { header: '包号', key: 'pack_seq' },
        { header: '重量', key: 'package_weight' },
        { header: '体积', key: 'package_volume' },
        { header: '创建时间', key: 'created_at' },
        { header: '板件ID', key: 'part_ids' }
      ];

      if (archive.packages && archive.packages.length > 0) {
        archive.packages.forEach(pkg => {
          const partIds = (pkg.parts || []).map(p => p.part_id).join(', ');
          packageSheet.addRow({
            pack_seq: pkg.pack_seq,
            package_weight: pkg.package_weight || 0,
            package_volume: pkg.package_volume || 0,
            created_at: pkg.created_at,
            part_ids: partIds
          });
        });
      }

      // 创建导出目录
      const exportDir = path.join(config.outputPath, 'exports');
      await fs.mkdir(exportDir, { recursive: true });

      // 生成文件名
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const fileName = `归档数据_${archive.customer_name}_${archive.id}_${timestamp}.xlsx`;
      const filePath = path.join(exportDir, fileName);

      // 保存文件
      await workbook.xlsx.writeFile(filePath);

      return {
        success: true,
        message: '导出成功',
        filePath
      };
    } catch (error) {
      console.error('导出Excel失败:', error);
      return { success: false, message: `导出Excel失败: ${error.message}` };
    }
  });

  // 导出归档数据到PDF
  ipcMain.handle('export-archive-to-pdf', async (event, archiveId) => {
    try {
      const result = await CustomerArchiveManager.getArchiveDetail(archiveId);
      if (!result.success) {
        return result;
      }

      const archive = result.data;
      const PDFDocument = require('pdfkit');
      const exportDir = path.join(config.outputPath, 'exports');
      await fs.mkdir(exportDir, { recursive: true });

      // 生成文件名
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const fileName = `归档数据_${archive.customer_name}_${archive.id}_${timestamp}.pdf`;
      const filePath = path.join(exportDir, fileName);

      // 创建PDF文档
      const doc = new PDFDocument();
      doc.pipe(fs.createWriteStream(filePath));

      // 添加标题
      doc.fontSize(20).text('客户归档详情', { align: 'center' });
      doc.moveDown();

      // 添加客户基本信息
      doc.fontSize(14).text('客户基本信息');
      doc.fontSize(12).text(`客户名称: ${archive.customer_name}`);
      doc.text(`客户地址: ${archive.customer_address || ''}`);
      doc.text(`归档日期: ${archive.archive_date}`);
      doc.text(`归档操作员: ${archive.archive_user}`);
      doc.text(`包数量: ${archive.packages_count || 0}`);
      doc.text(`板件总数: ${archive.total_parts_count || 0}`);
      doc.text(`备注: ${archive.remark || ''}`);
      doc.moveDown();

      // 添加包信息
      doc.fontSize(14).text('包信息列表');
      let yPosition = doc.y;

      // 表格头
      doc.fontSize(10)
        .text('包号', 50, yPosition)
        .text('重量', 150, yPosition)
        .text('体积', 220, yPosition)
        .text('创建时间', 290, yPosition)
        .text('板件ID', 400, yPosition);

      yPosition += 20;

      // 表格内容
      if (archive.packages && archive.packages.length > 0) {
        archive.packages.forEach(pkg => {
          const partIds = (pkg.parts || []).map(p => p.part_id).join(', ');

          // 检查是否需要添加新页面
          if (yPosition > 700) {
            doc.addPage();
            yPosition = 50;
          }

          doc.fontSize(10)
            .text(pkg.pack_seq || '', 50, yPosition)
            .text(pkg.package_weight || 0, 150, yPosition)
            .text(pkg.package_volume || 0, 220, yPosition)
            .text(pkg.created_at, 290, yPosition)
            .text(partIds, 400, yPosition);

          yPosition += 20;
        });
      }

      // 结束PDF文档
      doc.end();

      return {
        success: true,
        message: '导出成功',
        filePath
      };
    } catch (error) {
      console.error('导出PDF失败:', error);
      return { success: false, message: `导出PDF失败: ${error.message}` };
    }
  });
}

module.exports = {
  initArchiveHandlers
};
