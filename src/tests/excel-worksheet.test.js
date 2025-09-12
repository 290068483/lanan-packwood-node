const ExcelJS = require('exceljs');

describe('Excel Worksheet Tests', () => {
  let workbook;
  let worksheet;
  
  beforeEach(() => {
    workbook = new ExcelJS.Workbook();
    worksheet = workbook.addWorksheet('板件明细');
  });

  test('should create main worksheet with correct name', () => {
    expect(worksheet.name).toBe('板件明细');
  });

  test('should have correct headers', () => {
    // 添加标题行
    worksheet.mergeCells('A1:S1');
    const titleRow = worksheet.getRow(1);
    titleRow.getCell(1).value = '测试客户 - 板件明细';
    
    // 添加表头行
    const headerRow = worksheet.addRow([
      '标签号', 'ID号', '方案板号', '基材和颜色', '柜体名', '板件名', 
      '类型', '高', '宽', '厚', '面积', '纹理', '封边', '孔', 
      '槽铣', '拉直', '门向', '门铰孔', '备注'
    ]);
    
    const headers = headerRow.values.filter(value => value !== undefined);
    expect(headers).toHaveLength(19);
    expect(headers).toContain('标签号');
    expect(headers).toContain('ID号');
    expect(headers).toContain('柜体名');
    expect(headers).toContain('板件名');
  });

  test('should set correct styles for header row', () => {
    const headerRow = worksheet.addRow([
      '标签号', 'ID号', '方案板号', '基材和颜色', '柜体名', '板件名'
    ]);
    
    headerRow.font = { bold: true };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFCCCCCC' }
    };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
    
    // 验证样式设置
    expect(headerRow.font.bold).toBe(true);
    expect(headerRow.fill.fgColor.argb).toBe('FFCCCCCC');
    expect(headerRow.alignment.horizontal).toBe('center');
  });

  test('should handle data rows with correct alignment', () => {
    const dataRow = worksheet.addRow([
      'T001', '12345', 'PN001', '材质/颜色', '柜体1', '板件1'
    ]);
    
    dataRow.alignment = { vertical: 'middle', horizontal: 'center' };
    
    expect(dataRow.alignment.vertical).toBe('middle');
    expect(dataRow.alignment.horizontal).toBe('center');
  });
  
  test('should create packaged and remaining worksheets', () => {
    const packagedWorksheet = workbook.addWorksheet('已打包数据');
    const remainingWorksheet = workbook.addWorksheet('剩余打包数据');
    
    expect(packagedWorksheet.name).toBe('已打包数据');
    expect(remainingWorksheet.name).toBe('剩余打包数据');
  });
});