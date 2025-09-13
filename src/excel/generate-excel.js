const { XMLParser } = require('fast-xml-parser');
const fs = require('fs');
const XLSX = require('xlsx');

// 配置XML解析器
const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  textNodeName: 'text',
  parseAttributeValue: true,
  parseTagValue: true,
  trimValues: true
});

// 要分析的XML文件
const xmlFiles = ['优化文件.xml'];

function generateExcel(data) {
  // 创建工作簿
  const workbook = XLSX.utils.book_new();

  // 从XML中提取客户名称（使用第一个Cabinet的Customer属性）
  let customerName = '杨明磊'; // 默认客户名
  if (data.length > 0 && data[0]['@_Customer']) {
    customerName = data[0]['@_Customer'];
  }

  // 创建工作表数据，包含标题行和表头行
  const worksheetData = [
    [`${customerName} - 板件明细`], // 标题行
    [], // 空行
    ['标签号', 'ID号', '方案板号', '基材和颜色', '柜体名', '板件名', '类型', '高', '宽', '厚', '面积', '纹理', '封边', '孔', '槽铣', '拉直', '门向', '门铰孔', '备注']
  ],
  ];

  data.forEach(item => {
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

    worksheetData.push([
      item['@_CabinetPanelNo'] || '',
      item['@_ID'] || '',
      item['@_PartNumber'] || '',
      combinedMaterial,  // 基材和颜色组合
      item['@_CabinetType'] || '',
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
  });

  // 将数据转换为工作表
  const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);

  // 设置标题行样式
  const titleCell = 'A1';
  worksheet[titleCell].s = {
    font: {
      sz: 16,
      bold: true
    },
    alignment: {
      horizontal: 'center'
    }
  };

  // 合并标题行单元格（A1:S1）
  worksheet['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 18 } } // 合并第一行的所有列
  ];

  // 设置表头行样式
  const headerRow = 2; // 第3行是表头（索引从0开始）
  for (let col = 0; col < 19; col++) {
    const cellAddress = XLSX.utils.encode_cell({ r: headerRow, c: col });
    if (!worksheet[cellAddress]) {
      worksheet[cellAddress] = { t: 's', v: '' };
    }
    worksheet[cellAddress].s = {
      font: {
        bold: true
      },
      fill: {
        fgColor: { rgb: 'CCCCCC' }
      }
    };
  }

  // 设置列宽
  worksheet['!cols'] = [
    { wch: 10 }, // 标签号
    { wch: 15 }, // ID号
    { wch: 10 }, // 方案板号
    { wch: 25 }, // 基材和颜色
    { wch: 20 }, // 柜体名
    { wch: 15 }, // 板件名
    { wch: 8 },  // 类型
    { wch: 8 },  // 高
    { wch: 8 },  // 宽
    { wch: 8 },  // 厚
    { wch: 10 }, // 面积
    { wch: 8 },  // 纹理
    { wch: 12 }, // 封边
    { wch: 8 },  // 孔
    { wch: 8 },  // 槽铣
    { wch: 8 },  // 拉直
    { wch: 8 },  // 门向
    { wch: 10 }, // 门铰孔
    { wch: 15 }  // 备注
  ];

  XLSX.utils.book_append_sheet(workbook, worksheet, '板件明细');

  // 保存为Excel文件
  XLSX.writeFile(workbook, 'output_table.xlsx');
}

xmlFiles.forEach(fileName => {
  try {
    const xmlData = fs.readFileSync(fileName, 'utf8');
    console.log(`✓ 成功读取文件 ${fileName}`);

    // 解析XML数据
    const parsedData = parser.parse(xmlData);
    console.log('✓ XML数据解析成功');

    // 根据实际结构获取Panel数据
    const cabinets = parsedData.Root.Cabinet;
    let allPanels = [];

    // cabinets是一个数组，我们需要遍历所有cabinet中的Panel
    if (Array.isArray(cabinets)) {
      cabinets.forEach(cabinet => {
        if (cabinet && cabinet.Panels && cabinet.Panels.Panel) {
          if (Array.isArray(cabinet.Panels.Panel)) {
            allPanels = allPanels.concat(cabinet.Panels.Panel);
          } else {
            allPanels.push(cabinet.Panels.Panel);
          }
        }
      });
    } else if (cabinets && cabinets.Panels && cabinets.Panels.Panel) {
      // 单个cabinet的情况
      if (Array.isArray(cabinets.Panels.Panel)) {
        allPanels = cabinets.Panels.Panel;
      } else {
        allPanels.push(cabinets.Panels.Panel);
      }
    }

    if (allPanels.length > 0) {
      generateExcel(allPanels);
      console.log(`✓ Excel表格已生成到 output_table.xlsx，共 ${allPanels.length} 行数据`);
    } else {
      console.error('✗ 未找到Panel节点');
    }
  } catch (error) {
    console.error(`✗ 处理文件 ${fileName} 时出错:`, error.message);
    console.error(error.stack);
  }
});
