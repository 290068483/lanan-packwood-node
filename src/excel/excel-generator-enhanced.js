const fs = require('fs');
const path = require('path');
const ExcelJS = require('exceljs');

/**
 * 生成Excel文件（增强版）
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

        // 添加"板件明细"工作表
        const worksheet1 = workbook.addWorksheet('板件明细');

        // 添加标题行
        worksheet1.addRow([`${customerName} - 板件明细`]);
        const titleRow = worksheet1.getRow(1);
        titleRow.font = { bold: true, size: 16, color: { argb: 'FF0000A0' } }; // 蓝色标题（匹配old系统）
        titleRow.alignment = { vertical: 'middle', horizontal: 'center' };
        titleRow.height = 20;

        // 合并标题行单元格（现在有21列）
        worksheet1.mergeCells(1, 1, 1, 21);

        // 添加空行
        worksheet1.addRow([]);

        // 设置表头（从第3行开始）
        const headerRow = worksheet1.addRow([
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
            '包号',
            '打包时间',
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

        // 添加边框
        headerRow.eachCell((cell) => {
            cell.border = {
                top: { style: 'thin' },
                left: { style: 'thin' },
                bottom: { style: 'thin' },
                right: { style: 'thin' }
            };
        });

        // 记录已打包的行索引
        const packagedRows = [];

        // 记录总行数
        let totalPanels = 0;

        // 存储所有板件数据用于第二个工作表
        const allPanelData = [];

        // 读取packages.json中的已打包ID列表（如果存在且发生变化）
        let packagedIds = new Set();
        const localPackagePath = path.join(outputDir, 'packages.json');
        let packagesData = null;
        if (packageChanged && fs.existsSync(localPackagePath)) {
            try {
                packagesData = JSON.parse(
                    fs.readFileSync(localPackagePath, 'utf8')
                );

                // 如果packagesData是数组（多个打包记录）
                if (Array.isArray(packagesData)) {
                    packagesData.forEach(packageItem => {
                        if (packageItem.partIDs && Array.isArray(packageItem.partIDs)) {
                            packageItem.partIDs.forEach(partId => {
                                // 从右往左数5位作为ID号
                                if (partId &&
                                    typeof partId === 'string' &&
                                    partId.length >= 5) {
                                    const idNumber = partId.substring(partId.length - 5, partId.length);
                                    packagedIds.add(idNumber);
                                }
                            });
                        }
                    });
                }
                // 如果packagesData有partIDs字段（单个打包记录）
                else if (packagesData.partIDs && Array.isArray(packagesData.partIDs)) {
                    packagesData.partIDs.forEach(partId => {
                        // 从右往左数5位作为ID号
                        if (partId &&
                            typeof partId === 'string' &&
                            partId.length >= 5) {
                            const idNumber = partId.substring(partId.length - 5, partId.length);
                            packagedIds.add(idNumber);
                        }
                    });
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
                    const length = parseFloat(item['@_Length']) || 0;
                    const width = parseFloat(item['@_Width']) || 0;
                    const area = ((length * width) / 1000000).toFixed(3);

                    // 组合基材和颜色
                    const basicMaterial = item['@_BasicMaterial'] || '';
                    const materialColor = item['@_Material'] || '';
                    const combinedMaterial =
                        basicMaterial && materialColor
                            ? `${basicMaterial}/${materialColor}`
                            : basicMaterial || materialColor || '';

                    // 处理封边数据 - 老系统从板件明细中复制，现在从XML中提取
                    let edgeBanding = item['@_EdgeBanding'] || '';
                    if (edgeBanding && typeof edgeBanding === 'string') {
                        // 处理可能的分隔符，如逗号、分号等
                        edgeBanding = edgeBanding.replace(/[,;]+/g, ', ');
                        // 确保没有多余的空格
                        edgeBanding = edgeBanding.replace(/\s+/g, ' ').trim();
                    }

                    // 处理孔数据 - 老系统从板件明细中复制，现在从XML中提取
                    let hole = item['@_Hole'] || '';
                    if (hole && typeof hole === 'string') {
                        // 处理可能的分隔符，如逗号、分号等
                        hole = hole.replace(/[,;]+/g, ', ');
                        // 确保没有多余的空格
                        hole = hole.replace(/\s+/g, ' ').trim();
                    }

                    // 从Uid提取ID号（从右往左数5位）
                    let idNumber = '';
                    if (item['@_Uid']) {
                        const uid = item['@_Uid'];
                        // 从右往左数5位
                        if (uid.length >= 5) {
                            idNumber = uid.substring(uid.length - 5, uid.length);
                        } else {
                            idNumber = uid;
                        }
                    }

                    // 存储板件数据用于第二个工作表
                    const panelData = {
                        cabinetPanelNo: item['@_CabinetPanelNo'] || '',
                        idNumber: idNumber,
                        partNumber: item['@_PartNumber'] || '',
                        combinedMaterial: combinedMaterial,
                        cabinetName: chineseCabinetName,
                        panelName: item['@_Name'] || '',
                        type: item['@_Type'] || '',
                        height: item['@_Width'] || '', // 高
                        width: item['@_Length'] || '', // 宽
                        thickness: item['@_Thickness'] || '', // 厚
                        area: area,
                        grain: item['@_Grain'] || '',
                        edgeBanding: item['@_EdgeBanding'] || '', // 封边 (已优化处理)
                        hole: item['@_Hole'] || '', // 孔 (已优化处理)
                        slot: item['@_Slot'] || '', // 槽铣
                        straightening: item['@_Straightening'] || '', // 拉直
                        doorDirection: item['@_DoorDirection'] || '',
                        hingeHole: item['@_HingeHole'] || '', // 门铰孔
                        remarks: item['@_Remarks'] || '', // 备注
                        packSeq: '', // 包号，将在后面填充
                        packDate: '', // 打包时间，将在后面填充
                        isPackaged: packageChanged && idNumber && packagedIds.has(idNumber)
                    };

                    allPanelData.push(panelData);

                    // 如果板件已打包，查找对应的包号和打包时间
                    if (panelData.isPackaged && packagesData) {
                        // 查找包含此ID的包
                        const packageArray = Array.isArray(packagesData) ? packagesData : [packagesData];
                        for (const packageItem of packageArray) {
                            if (packageItem.partIDs && Array.isArray(packageItem.partIDs)) {
                                if (packageItem.partIDs.includes(item['@_Uid'])) {
                                    // 使用packages.json中的实际值，如果没有则使用默认值
                                    panelData.packSeq = packageItem.packSeq || `包${String(packageArray.indexOf(packageItem) + 1).padStart(3, "0")}`;
                                    // 格式化日期时间
                                    if (packageItem.packDate) {
                                        const date = new Date(packageItem.packDate);
                                        panelData.packDate = date.toLocaleString('zh-CN', {
                                            year: 'numeric',
                                            month: '2-digit',
                                            day: '2-digit',
                                            hour: '2-digit',
                                            minute: '2-digit',
                                            second: '2-digit'
                                        });
                                    } else {
                                        panelData.packDate = new Date().toLocaleString('zh-CN');
                                    }
                                    break;
                                }
                            }
                        }
                    }

                    const dataRow = worksheet1.addRow([
                        panelData.cabinetPanelNo,
                        panelData.idNumber,
                        panelData.partNumber,
                        panelData.combinedMaterial,
                        panelData.cabinetName,
                        panelData.panelName,
                        panelData.type,
                        panelData.height,
                        panelData.width,
                        panelData.thickness,
                        panelData.area,
                        panelData.grain,
                        panelData.edgeBanding,
                        panelData.hole,
                        panelData.slot,
                        panelData.straightening,
                        panelData.doorDirection,
                        panelData.hingeHole,
                        panelData.packSeq,      // 包号
                        panelData.packDate,     // 打包时间
                        panelData.remarks,
                    ]);

                    // 设置数据行样式 - 居中对齐
                    dataRow.alignment = { vertical: 'middle', horizontal: 'center' };
                    dataRow.height = 18;

                    // 添加边框
                    dataRow.eachCell((cell) => {
                        cell.border = {
                            top: { style: 'thin' },
                            left: { style: 'thin' },
                            bottom: { style: 'thin' },
                            right: { style: 'thin' }
                        };
                    });

                    // 只有当package.json发生变化时，才检查并标记已打包的行
                    if (panelData.isPackaged) {
                        // 记录已打包的行索引
                        packagedRows.push(worksheet1.rowCount);

                        dataRow.fill = {
                            type: 'pattern',
                            pattern: 'solid',
                            fgColor: { argb: 'FFCCCCCC' }, // 灰色背景
                        };
                    }
                });
            }
        });

        // 设置列宽（更接近old系统的设置，增加了包号和打包时间列）
        worksheet1.columns = [
            { width: 8 },  // 标签号
            { width: 6 },  // ID号
            { width: 7 },  // 方案板号
            { width: 20 }, // 基材和颜色
            { width: 14 }, // 柜体名
            { width: 14 }, // 板件名
            { width: 6 },  // 类型
            { width: 8 },  // 高
            { width: 8 },  // 宽
            { width: 5 },  // 厚
            { width: 7 },  // 面积
            { width: 8 },  // 纹理
            { width: 25 }, // 封边
            { width: 8 },  // 孔
            { width: 8 },  // 槽铣
            { width: 8 },  // 拉直
            { width: 8 },  // 门向
            { width: 10 }, // 门铰孔
            { width: 8 },  // 包号 (增加宽度)
            { width: 20 }, // 打包时间
            { width: 20 }, // 备注
        ];

        // 设置封边和孔列的文本换行和自动调整行高
        worksheet1.getColumn('M').alignment = { wrapText: true, vertical: 'middle' }; // 封边列
        worksheet1.getColumn('N').alignment = { wrapText: true, vertical: 'middle' }; // 孔列

        // 添加"已打包"工作表
        const worksheet2 = workbook.addWorksheet('已打包');

        // 添加标题行
        worksheet2.addRow([`${customerName} - 已包板件`]);
        const titleRow2 = worksheet2.getRow(1);
        titleRow2.font = { bold: true, size: 16, color: { argb: 'FFCC0000' } }; // 红色标题
        titleRow2.alignment = { vertical: 'middle', horizontal: 'center' };
        titleRow2.height = 28;

        // 合并标题行单元格
        worksheet2.mergeCells(1, 1, 1, 15);

        // 添加表头（从第2行开始）
        const headerRow2 = worksheet2.addRow([
            '包号',
            '房间名 柜体名',
            '数量',
            '打包时间',
            '标签号',
            'ID号',
            '方案板号',
            '基材和颜色',
            '板件名',
            '类型',
            '尺寸',
            '',
            '',
            '面积',
            '备注'
        ]);

        // 添加尺寸子标题
        const subHeaderRow = worksheet2.addRow([
            '',
            '',
            '',
            '',
            '',
            '',
            '',
            '',
            '',
            '',
            '高',
            '宽',
            '厚',
            '',
            ''
        ]);

        // 设置表头样式
        headerRow2.font = { bold: true, size: 10 };
        headerRow2.alignment = {
            vertical: 'middle',
            horizontal: 'center',
        };
        headerRow2.height = 14;

        subHeaderRow.font = { bold: true, size: 9 };
        subHeaderRow.alignment = {
            vertical: 'middle',
            horizontal: 'center',
        };
        subHeaderRow.height = 13;

        // 设置表头背景色
        headerRow2.eachCell((cell) => {
            cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFFFFFFF' }, // 白色背景
            };
            cell.border = {
                top: { style: 'medium' },
                left: { style: 'medium' },
                bottom: { style: 'medium' },
                right: { style: 'medium' }
            };
        });

        subHeaderRow.eachCell((cell, colNumber) => {
            if (colNumber >= 11 && colNumber <= 13) { // 尺寸列
                cell.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: 'FFFFFFFF' }, // 白色背景
                };
                cell.border = {
                    top: { style: 'medium' },
                    left: { style: 'medium' },
                    bottom: { style: 'medium' },
                    right: { style: 'medium' }
                };
            }
        });

        // 合并尺寸标题单元格
        worksheet2.mergeCells(2, 11, 2, 13);
        worksheet2.getCell('K2').value = '尺寸';

        // 合并其他需要合并的单元格
        worksheet2.mergeCells(2, 1, 3, 1); // 包号
        worksheet2.mergeCells(2, 2, 3, 2); // 房间名 柜体名
        worksheet2.mergeCells(2, 3, 3, 3); // 数量
        worksheet2.mergeCells(2, 4, 3, 4); // 打包时间
        worksheet2.mergeCells(2, 5, 3, 5); // 标签号
        worksheet2.mergeCells(2, 6, 3, 6); // ID号
        worksheet2.mergeCells(2, 7, 3, 7); // 方案板号
        worksheet2.mergeCells(2, 8, 3, 8); // 基材和颜色
        worksheet2.mergeCells(2, 9, 3, 9); // 板件名
        worksheet2.mergeCells(2, 10, 3, 10); // 类型
        worksheet2.mergeCells(2, 14, 3, 14); // 面积
        worksheet2.mergeCells(2, 15, 3, 15); // 备注

        // 添加已打包数据
        let currentRow = 4;

        // 如果有packages.json数据，则添加已打包记录
        if (packagesData) {
            // 确保packagesData是数组格式
            const packageArray = Array.isArray(packagesData) ? packagesData : [packagesData];
            // 检查是否有打包数据
            let hasPackagedData = false;
            packageArray.forEach(packageItem => {
                if (packageItem.partIDs && Array.isArray(packageItem.partIDs) && packageItem.partIDs.length > 0) {
                    hasPackagedData = true;
                }
            });

            // 如果没有打包数据，添加提示信息
            if (!hasPackagedData) {
                const noDataRow = worksheet2.addRow([
                    "暂无打包数据", "", "", "", "", "", "", "", "", "", "", "", "", "", ""
                ]);
                noDataRow.font = { italic: true };
                noDataRow.alignment = { vertical: "middle", horizontal: "center" };
                // 合并单元格
                worksheet2.mergeCells(4, 1, 4, 15);
                // 不提前返回，继续执行后续代码
            }
            // 处理打包数据（这里简化处理，实际应用中需要根据packages.json的结构来处理）
            // packageArray已经在上面定义过了，这里不需要重复定义

            packageArray.forEach((packageItem, index) => {
                const packSeq = packageItem.packSeq || `包${String(index + 1).padStart(3, "0")}`;
                const packQty = packageItem.packQty || 1;
                const packDate = packageItem.packDate || new Date().toLocaleString();

                if (packageItem.partIDs && Array.isArray(packageItem.partIDs)) {
                    packageItem.partIDs.forEach((partId, partIndex) => {
                        // 从右往左数5位作为ID号
                        let idNumber = '';
                        if (partId && typeof partId === 'string' && partId.length >= 5) {
                            idNumber = partId.substring(partId.length - 5, partId.length);
                        } else {
                            idNumber = partId;
                        }

                        // 查找对应的板件数据
                        // 先尝试精确匹配
                        let panelData = allPanelData.find(data => data.idNumber === idNumber);
                        // 如果找不到，尝试匹配完整UID
                        if (!panelData && partId) {
                            panelData = allPanelData.find(data => data.idNumber === partId.substring(partId.length - 5, partId.length));
                        }
                        // 如果还找不到，尝试匹配整个UID
                        if (!panelData && partId) {
                            panelData = allPanelData.find(data => data.idNumber === partId);
                        }

                        if (panelData) {
                            const dataRow = worksheet2.addRow([
                                packSeq,
                                panelData.cabinetName,
                                packQty,
                                packDate,
                                panelData.cabinetPanelNo,
                                panelData.idNumber,
                                panelData.partNumber,
                                panelData.combinedMaterial,
                                panelData.panelName,
                                panelData.type,
                                panelData.height,
                                panelData.width,
                                panelData.thickness,
                                panelData.area,
                                panelData.remarks
                            ]);

                            // 设置数据行样式
                            dataRow.alignment = { vertical: 'middle', horizontal: 'center' };
                            dataRow.font = { name: '宋体', size: 9 };

                            // 添加边框
                            dataRow.eachCell((cell) => {
                                cell.border = {
                                    top: { style: 'thin' },
                                    left: { style: 'thin' },
                                    bottom: { style: 'thin' },
                                    right: { style: 'thin' }
                                };
                            });

                            currentRow++;
                        }
                    });
                }
            });
        } else {
            // 如果没有packages.json数据，添加提示信息
            const noDataRow = worksheet2.addRow([
                "暂无打包数据", "", "", "", "", "", "", "", "", "", "", "", "", "", ""
            ]);
            noDataRow.font = { italic: true };
            noDataRow.alignment = { vertical: "middle", horizontal: "center" };
            // 合并单元格
            worksheet2.mergeCells(4, 1, 4, 15);
        }

        // 设置第二个工作表的列宽
        worksheet2.columns = [
            { width: 5 },   // 包号
            { width: 22 },  // 房间名 柜体名
            { width: 4 },   // 数量
            { width: 24 },  // 打包时间
            { width: 4 },   // 标签号
            { width: 15 },  // ID号
            { width: 8 },   // 方案板号
            { width: 30 },  // 基材和颜色
            { width: 20 },  // 板件名
            { width: 5 },   // 类型
            { width: 6 },   // 高
            { width: 6 },   // 宽
            { width: 4 },   // 厚
            { width: 5 },   // 面积
            { width: 30 }   // 备注
        ];

        // 设置第二个工作表的封边和孔列的文本换行和自动调整行高
        worksheet2.getColumn('H').alignment = { wrapText: true, vertical: 'middle' }; // 基材和颜色列
        worksheet2.getColumn('O').alignment = { wrapText: true, vertical: 'middle' }; // 备注列

        // 设置第二个工作表的默认行高
        worksheet2.eachRow((row, rowNumber) => {
            if (rowNumber > 3) {
                row.height = 17;
            }
        });

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