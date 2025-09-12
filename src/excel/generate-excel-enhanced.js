const { XMLParser } = require('fast-xml-parser');
const fs = require('fs');
const ExcelJS = require('exceljs');

// 配置XML解析器
const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
    textNodeName: "text",
    parseAttributeValue: true,
    parseTagValue: true,
    trimValues: true
});

// 要分析的XML文件
const xmlFiles = ['优化文件.xml'];

async function generateExcel(cabinets) {
    // 创建工作簿
    const workbook = new ExcelJS.Workbook();
    
    // 从第一个Cabinet中提取客户名称
    let customerName = '杨明磊'; // 默认客户名
    if (cabinets.length > 0 && cabinets[0]['@_Customer']) {
        customerName = cabinets[0]['@_Customer'];
    }

    // 创建工作表
    const worksheet = workbook.addWorksheet('板件明细');

    // 添加标题行
    worksheet.mergeCells('A1:S1');
    const titleRow = worksheet.getRow(1);
    titleRow.getCell(1).value = `${customerName} - 板件明细`;
    titleRow.getCell(1).font = { size: 16, bold: true };
    titleRow.getCell(1).alignment = { vertical: 'middle', horizontal: 'center' };
    titleRow.height = 24;

    // 添加空行
    worksheet.addRow([]);

    // 添加表头行
    const headerRow = worksheet.addRow([
        '标签号', 'ID号', '方案板号', '基材和颜色', '柜体名', '板件名', 
        '类型', '高', '宽', '厚', '面积', '纹理', '封边', '孔', 
        '槽铣', '拉直', '门向', '门铰孔', '备注'
    ]);

    // 设置表头样式 - 居中对齐
    headerRow.font = { bold: true };
    headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFCCCCCC' }
    };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
    headerRow.height = 20;

    // 添加数据行
    cabinets.forEach((cabinet, cabinetIndex) => {
        // 获取柜体的中文名称
        let chineseCabinetName = cabinet['@_GroupName'] || cabinet['@_Name'] || '未知柜体';
        
        if (cabinet && cabinet.Panels && cabinet.Panels.Panel) {
            let panels = [];
            if (Array.isArray(cabinet.Panels.Panel)) {
                panels = cabinet.Panels.Panel;
            } else {
                panels = [cabinet.Panels.Panel];
            }
            
            panels.forEach(item => {
                // 计算面积（长*宽，转换为平方米）
                const length = item['@_Length'] || 0;
                const width = item['@_Width'] || 0;
                const area = ((length * width) / 1000000).toFixed(3);
                
                // 组合基材和颜色
                const basicMaterial = item['@_BasicMaterial'] || '';
                const materialColor = item['@_Material'] || '';
                const combinedMaterial = basicMaterial && materialColor 
                    ? `${basicMaterial}/${materialColor}` 
                    : (basicMaterial || materialColor || '');
                
                const dataRow = worksheet.addRow([
                    item['@_CabinetPanelNo'] || '',
                    item['@_ID'] || '',
                    item['@_PartNumber'] || '',
                    combinedMaterial,  // 基材和颜色组合
                    chineseCabinetName,  // 使用中文柜体名
                    item['@_Name'] || '',
                    item['@_Type'] || '',
                    item['@_Width'] || '',  // 高
                    item['@_Length'] || '',  // 宽
                    item['@_Thickness'] || '',
                    area,  // 面积
                    item['@_Grain'] || '',
                    item['@_EdgeGroupTypeName'] || '',  // 封边类型名称
                    item['@_HasHorizontalHole'] === 1 ? '是' : (item['@_HasHorizontalHole'] === 0 ? '否' : item['@_HasHorizontalHole']),
                    '',  // 槽铣（需要查找对应属性）
                    '',  // 拉直（需要查找对应属性）
                    item['@_DoorDirection'] || '',
                    '',  // 门铰孔（需要查找对应属性）
                    ''   // 备注（需要查找对应属性）
                ]);
                
                // 设置数据行样式 - 左对齐
                dataRow.alignment = { vertical: 'middle', horizontal: 'left' };
                dataRow.height = 18;
            });
        }
    });

    // 设置列宽
    worksheet.columns = [
        { width: 12 },  // 标签号
        { width: 16 },  // ID号
        { width: 10 },  // 方案板号
        { width: 25 },  // 基材和颜色
        { width: 20 },  // 柜体名
        { width: 15 },  // 板件名
        { width: 8 },   // 类型
        { width: 8 },   // 高
        { width: 8 },   // 宽
        { width: 8 },   // 厚
        { width: 10 },  // 面积
        { width: 8 },   // 纹理
        { width: 12 },  // 封边
        { width: 8 },   // 孔
        { width: 8 },   // 槽铣
        { width: 8 },   // 拉直
        { width: 8 },   // 门向
        { width: 10 },  // 门铰孔
        { width: 15 }   // 备注
    ];

    // 保存为Excel文件
    await workbook.xlsx.writeFile('output_table_enhanced.xlsx');
    console.log('✓ 增强版Excel表格已生成到 output_table_enhanced.xlsx');
}

xmlFiles.forEach(fileName => {
    try {
        const xmlData = fs.readFileSync(fileName, 'utf8');
        console.log(`✓ 成功读取文件 ${fileName}`);

        // 解析XML数据
        const parsedData = parser.parse(xmlData);
        console.log('✓ XML数据解析成功');

        // 获取Cabinet数据
        const cabinets = parsedData.Root.Cabinet;

        if (Array.isArray(cabinets) && cabinets.length > 0) {
            generateExcel(cabinets)
                .then(() => {
                    // 计算总的Panel数量
                    let totalPanels = 0;
                    cabinets.forEach(cabinet => {
                        if (cabinet && cabinet.Panels && cabinet.Panels.Panel) {
                            if (Array.isArray(cabinet.Panels.Panel)) {
                                totalPanels += cabinet.Panels.Panel.length;
                            } else {
                                totalPanels += 1;
                            }
                        }
                    });
                    console.log(`✓ Excel表格已生成到 output_table_enhanced.xlsx，共 ${totalPanels} 行数据`);
                })
                .catch(error => {
                    console.error('✗ 生成Excel文件时出错:', error.message);
                });
        } else {
            console.error('✗ 未找到Cabinet节点');
        }

    } catch (error) {
        console.error(`✗ 处理文件 ${fileName} 时出错:`, error.message);
        console.error(error.stack);
    }
});