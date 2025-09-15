const fs = require('fs');
const path = require('path');
const ExcelJS = require('exceljs');

/**
 * 生成Excel文件
 * @param {Array} cabinets - Cabinet数据数组
 * @param {string} customerName - 客户名称
 * @param {string} outputDir - 输出目录
 * @param {boolean} packageChanged - package.json是否发生变化
 * @returns {Promise<Object>} 生成结果对象
 */
async function generateExcel(
  cabinets,
  customerName,
  outputDir,
  packageChanged
) {
  try {
    // 创建一个新的Excel工作簿
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Sheet1');

    // 添加标题行
    worksheet.addRow([`${customerName} - 板件明细`]);
    const titleRow = worksheet.getRow(1);
    titleRow.font = { bold: true, size: 16 };
    titleRow.alignment = { vertical: 'middle', horizontal: 'center' };
    titleRow.height = 20;

    // 合并标题行单元格
    worksheet.mergeCells(1, 1, 1, 19);

    // 添加空行
    worksheet.addRow([]);

    // 设置表头（从第3行开始）
    const headerRow = worksheet.addRow([
      '标签号',
      'ID号',
      '方案板号',
      '基材和颜色',
      '柜体名',
      '板件名',
      '类型',
      '高',
      '宽',
      '厚',
      '面积',
      '纹理',
      '封边',
      '孔',
      '槽铣',
      '拉直',
      '门向',
      '门铰孔',
      '备注',
    ]);

    // 设置表头样式
    headerRow.font = { bold: true };
    headerRow.alignment = {
      vertical: 'middle',
      horizontal: 'center',
    };
    headerRow.height = 18;
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFCCCCCC' }, // 灰色背景
    };

    // 记录已打包的行索引
    const packagedRows = [];

    // 记录总行数
    let totalPanels = 0;

    // 读取packages.json中的已打包ID列表（如果存在且发生变化）
    let packagedIds = new Set();
    const localPackagePath = path.join(outputDir, 'packages.json');
    if (packageChanged && fs.existsSync(localPackagePath)) {
      try {
        const packageData = JSON.parse(
          fs.readFileSync(localPackagePath, 'utf8')
        );
        if (packageData.packagedIds && Array.isArray(packageData.packagedIds)) {
          packagedIds = new Set(packageData.packagedIds);
        }
      } catch (error) {
        console.warn('读取packages.json中的已打包ID列表时出错:', error.message);
      }
    }

    // 遍历每个柜体
    cabinets.forEach(cabinet => {
      // 获取柜体的中文名称
      const chineseCabinetName =
        cabinet['@_GroupName'] || cabinet['@_Name'] || '未知柜体';

      // 遍历每个板件
      if (cabinet && cabinet.Panels && cabinet.Panels.Panel) {
        const panels = Array.isArray(cabinet.Panels.Panel)
          ? cabinet.Panels.Panel
          : [cabinet.Panels.Panel];

        panels.forEach(item => {
          totalPanels++;

          // 计算面积（长*宽，转换为平方米）
          const length = item['@_Length'] || 0;
          const width = item['@_Width'] || 0;
          const area = ((length * width) / 1000000).toFixed(3);

          // 组合基材和颜色
          const basicMaterial = item['@_BasicMaterial'] || '';
          const materialColor = item['@_Material'] || '';
          const combinedMaterial =
            basicMaterial && materialColor
              ? `${basicMaterial}/${materialColor}`
              : basicMaterial || materialColor || '';

          // 从Uid提取ID号（后5位）
          let idNumber = '';
          if (item['@_Uid']) {
            idNumber = item['@_Uid'].slice(-5);
          }

          const dataRow = worksheet.addRow([
            item['@_CabinetPanelNo'] || '',
            idNumber,
            item['@_PartNumber'] || '',
            combinedMaterial,
            chineseCabinetName,
            item['@_Name'] || '',
            item['@_Type'] || '',
            item['@_Width'] || '', // 高
            item['@_Length'] || '', // 宽
            item['@_Thickness'] || '', // 厚
            area,
            item['@_Grain'] || '',
            item['@_EdgeBanding'] || '', // 封边
            item['@_Hole'] || '', // 孔
            item['@_Slot'] || '', // 槽铣
            item['@_Straightening'] || '', // 拉直
            item['@_DoorDirection'] || '',
            item['@_HingeHole'] || '', // 门铰孔
            item['@_Remarks'] || '', // 备注
          ]);

          // 设置数据行样式 - 居中对齐
          dataRow.alignment = { vertical: 'middle', horizontal: 'center' };
          dataRow.height = 18;

          // 只有当package.json发生变化时，才检查并标记已打包的行
          if (packageChanged && idNumber && packagedIds.has(idNumber)) {
            // 记录已打包的行索引
            packagedRows.push(worksheet.rowCount);

            dataRow.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FFCCCCCC' }, // 灰色背景
            };
          }
        });
      }
    });

    // 设置列宽
    worksheet.columns = [
      { width: 12 }, // 标签号
      { width: 16 }, // ID号
      { width: 10 }, // 方案板号
      { width: 25 }, // 基材和颜色
      { width: 20 }, // 柜体名
      { width: 15 }, // 板件名
      { width: 8 }, // 类型
      { width: 8 }, // 高
      { width: 8 }, // 宽
      { width: 8 }, // 厚
      { width: 10 }, // 面积
      { width: 8 }, // 纹理
      { width: 12 }, // 封边
      { width: 8 }, // 孔
      { width: 8 }, // 槽铣
      { width: 8 }, // 拉直
      { width: 8 }, // 门向
      { width: 10 }, // 门铰孔
      { width: 15 }, // 备注
    ];

    // 生成输出文件名
    const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const outputFileName = path.join(outputDir, `板件明细_${timestamp}.xlsx`);

    // 保存为Excel文件
    await workbook.xlsx.writeFile(outputFileName);
    console.log(`\n✓ Excel表格已生成到 ${outputFileName}`);
    console.log(`✓ 共处理 ${totalPanels} 行数据`);

    return { success: true, packagedRows, totalRows: totalPanels };
  } catch (error) {
    throw new Error(`生成Excel文件失败: ${error.message}`);
  }
}

module.exports = { generateExcel };
