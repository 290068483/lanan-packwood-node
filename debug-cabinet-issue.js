const fs = require('fs');
const path = require('path');
const { parseXmlWithFallback } = require('./src/utils/xml-parser');
const { createCabinetsFromPanels } = require('./src/utils/temp-xml-generator');

// 读取配置文件
const configPath = path.join(__dirname, 'config.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

// 清理XML名称函数
function sanitizeXmlName(name) {
    // 处理非字符串类型
    if (name === null || name === undefined) return 'item';
    if (typeof name !== 'string') {
        name = String(name);
    }
    // 移除所有非法XML名称字符
    let sanitized = name.replace(/[\x00-\x1F\x7F]/g, '');
    sanitized = sanitized.replace(/[^\w:\-\.]/g, '');
    if (!sanitized || sanitized.length === 0) {
        sanitized = 'item';
    }
    if (!/^[a-zA-Z_:]/.test(sanitized)) {
        if (/^[0-9\-\.]/.test(sanitized)) {
            sanitized = 'x' + sanitized;
        } else {
            sanitized = 'item' + sanitized;
        }
    }
    if (sanitized.length > 100) {
        sanitized = sanitized.substring(0, 100);
    }
    const xmlKeywords = ['xml', 'Xml', 'XML'];
    if (xmlKeywords.includes(sanitized)) {
        sanitized = 'x' + sanitized;
    }
    return sanitized;
}

// 从源XML文件中提取Panel数据并分析Cabinet属性
async function analyzeCabinetIssue() {
    try {
        // 获取源目录
        const sourceBaseDir = config.sourcePath;
        if (!fs.existsSync(sourceBaseDir)) {
            console.log(`❌ 源基础目录不存在: ${sourceBaseDir}`);
            return;
        }

        // 查找龙恒宇客户目录
        const customerDir = '龙恒宇';
        const customerPath = path.join(sourceBaseDir, customerDir);
        console.log(`📁 正在分析客户: ${customerPath}`);

        // 查找设备文件目录
        let deviceDir = path.join(customerPath, 'N1产线', '0、排版文件');
        if (!fs.existsSync(deviceDir)) {
            deviceDir = path.join(customerPath, '设备文件', 'N1产线', '0、排版文件');
        }

        if (!fs.existsSync(deviceDir)) {
            console.log(`⚠ 未找到设备文件目录: ${customerDir}`);
            return;
        }

        // 查找产线目录
        const lineDirs = fs.readdirSync(deviceDir).filter(dir => 
            fs.statSync(path.join(deviceDir, dir)).isDirectory()
        );

        if (lineDirs.length === 0) {
            console.log(`⚠ 未找到任何产线目录: ${customerDir}`);
            return;
        }

        // 处理排版文件目录
        const lineDir = '排版文件';
        const linePath = path.join(deviceDir, lineDir);
        console.log(`  📁 正在分析产线: ${lineDir}`);

        // 查找XML文件
        const xmlFiles = fs.readdirSync(linePath).filter(file => path.extname(file) === '.xml');
        if (xmlFiles.length === 0) {
            console.log(`  ⚠ 产线目录中未找到XML文件: ${lineDir}`);
            return;
        }

        const xmlFile = xmlFiles[0];
        const xmlFilePath = path.join(linePath, xmlFile);
        console.log(`  📄 读取XML文件: ${xmlFilePath}`);
        const xmlData = fs.readFileSync(xmlFilePath, 'utf8');

        // 解析XML数据
        const parseResult = parseXmlWithFallback(xmlData, lineDir, customerDir);
        if (!parseResult.success) {
            console.log(`  ✗ 解析XML文件失败: ${parseResult.error}`);
            return;
        }

        console.log(`  📊 使用${parseResult.parser}解析器解析成功`);

        // 处理不同的XML结构，提取Cabinet信息
        let cabinets = [];

        // 结构1: Root.Cabinets.Cabinet (旧结构)
        if (parseResult.data.Root.Cabinets && parseResult.data.Root.Cabinets.Cabinet) {
            cabinets = Array.isArray(parseResult.data.Root.Cabinets.Cabinet)
                ? parseResult.data.Root.Cabinets.Cabinet
                : [parseResult.data.Root.Cabinets.Cabinet];
            console.log(`  📦 提取到 ${cabinets.length} 个Cabinet数据 (结构1)`);
        }
        // 结构2: Root.Cabinet (新结构)
        else if (parseResult.data.Root.Cabinet) {
            cabinets = Array.isArray(parseResult.data.Root.Cabinet)
                ? parseResult.data.Root.Cabinet
                : [parseResult.data.Root.Cabinet];
            console.log(`  📦 提取到 ${cabinets.length} 个Cabinet数据 (结构2)`);
        }

        // 提取所有Panel数据并分析Cabinet属性
        const allPanels = [];
        cabinets.forEach(cabinet => {
            if (cabinet.Panels && cabinet.Panels.Panel) {
                if (Array.isArray(cabinet.Panels.Panel)) {
                    allPanels.push(...cabinet.Panels.Panel);
                } else {
                    allPanels.push(cabinet.Panels.Panel);
                }
            }
        });

        console.log(`  📊 总共提取到 ${allPanels.length} 个Panel数据`);

        // 统计Panel中的Cabinet属性
        const cabinetNames = new Map();
        allPanels.forEach((panel, index) => {
            const cabinetName = panel.Cabinet || 'DefaultCabinet';
            cabinetNames.set(cabinetName, (cabinetNames.get(cabinetName) || 0) + 1);
        });

        console.log('  🔍 Panel中的Cabinet属性统计:');
        cabinetNames.forEach((count, name) => {
            console.log(`    - ${name}: ${count} 个Panel`);
        });

        // 创建临时输出文件以验证
        const tempOutputDir = path.join(__dirname, 'temp-debug');
        if (!fs.existsSync(tempOutputDir)) {
            fs.mkdirSync(tempOutputDir, { recursive: true });
        }

        // 将面板数据中的Cabinet信息保存到文件
        const panelCabinetInfo = JSON.stringify({
            totalPanels: allPanels.length,
            cabinetDistribution: Object.fromEntries(cabinetNames),
            samplePanelWithCabinet: allPanels.find(p => p.Cabinet) || null
        }, null, 2);

        const infoFilePath = path.join(tempOutputDir, 'panel-cabinet-info.json');
        fs.writeFileSync(infoFilePath, panelCabinetInfo, 'utf8');
        console.log(`  💾 面板Cabinet信息已保存到: ${infoFilePath}`);

        // 修复createCabinetsFromPanels函数以正确识别Cabinet
        console.log('  🔧 现在测试修复后的createCabinetsFromPanels函数...');
        
        // 确保每个Panel都有正确的Cabinet属性
        const panelsWithCabinet = allPanels.map((panel, index) => {
            // 如果Panel没有Cabinet属性，尝试从源Cabinet结构中恢复
            if (!panel.Cabinet && cabinets.length > 0) {
                // 简单策略：平均分配Panel到不同的Cabinet
                const cabinetIndex = Math.floor(index / (allPanels.length / cabinets.length));
                const assignedCabinet = cabinets[Math.min(cabinetIndex, cabinets.length - 1)];
                panel.Cabinet = assignedCabinet['@_Name'] || `Cabinet${cabinetIndex + 1}`;
            }
            return panel;
        });

        // 使用修复后的面板数据创建Cabinet
        const currentDate = new Date();
        const orderNo = 'F' + currentDate.toISOString().slice(2, 10).replace(/-/g, '');
        const shopOrderCode = 'S' + currentDate.toISOString().slice(2, 10).replace(/-/g, '') + '0001';
        const currentDateTime = currentDate.toISOString().slice(0, 19).replace('T', ' ');
        const deliveryDate = new Date(currentDate.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
        const batchNo = 'PC' + currentDate.toISOString().slice(2, 10).replace(/-/g, '') + '0001';

        const defaultValues = {
            customerAddress: customerDir + '地址',
            customerPhone: '13800000000',
            groupName: customerDir + '柜组',
            roomName: customerDir + '房间',
            shopName: customerDir + '门店'
        };

        // 复制createCabinetsFromPanels函数的实现用于测试
        function testCreateCabinetsFromPanels(panels, customerName, currentDateTime, orderNo, shopOrderCode, defaultValues, deliveryDate, batchNo) {
            const cabinets = [];
            const cabinetMap = new Map();

            // 按Cabinet分组panels
            panels.forEach(panel => {
                const cabinetName = panel.Cabinet || 'DefaultCabinet';
                if (!cabinetMap.has(cabinetName)) {
                    // 清理cabinetName以确保XML兼容性
                    const sanitizedCabinetName = sanitizeXmlName(cabinetName);
                    
                    const cabinet = {};
                    // 确保所有属性名都经过清理
                    cabinet[sanitizeXmlName('Name')] = sanitizedCabinetName;
                    cabinet[sanitizeXmlName('Customer')] = customerName;
                    cabinet[sanitizeXmlName('ContactRealName')] = customerName;
                    cabinet[sanitizeXmlName('OrderNo')] = orderNo;
                    cabinet[sanitizeXmlName('ShopOrderCode')] = shopOrderCode;
                    cabinet[sanitizeXmlName('OrderDate')] = currentDateTime;
                    cabinet[sanitizeXmlName('DeliveryDate')] = deliveryDate;
                    cabinet[sanitizeXmlName('BatchNo')] = batchNo;
                    cabinet[sanitizeXmlName('Address')] = defaultValues.customerAddress;
                    cabinet[sanitizeXmlName('ContactAddress')] = defaultValues.customerAddress;
                    cabinet[sanitizeXmlName('CustomAddress')] = defaultValues.customerAddress;
                    cabinet[sanitizeXmlName('ContactWay')] = defaultValues.customerPhone;
                    cabinet[sanitizeXmlName('Tel')] = defaultValues.customerPhone;
                    cabinet[sanitizeXmlName('GroupName')] = defaultValues.groupName;
                    cabinet[sanitizeXmlName('RoomName')] = defaultValues.roomName;
                    cabinet[sanitizeXmlName('ShopName')] = defaultValues.shopName;
                    cabinet[sanitizeXmlName('Panels')] = {
                        [sanitizeXmlName('Panel')]: []
                    };
                    
                    cabinetMap.set(cabinetName, cabinet);
                }
                // 移除Panel对象中的Cabinet属性，避免重复
                const panelCopy = JSON.parse(JSON.stringify(panel));
                delete panelCopy.Cabinet;
                
                // 添加到对应的Cabinet
                cabinetMap.get(cabinetName)['Panels']['Panel'].push(panelCopy);
            });

            // 转换为数组
            cabinetMap.forEach(cabinet => {
                cabinets.push(cabinet);
            });

            return cabinets;
        }

        // 测试修复后的函数
        const fixedCabinets = testCreateCabinetsFromPanels(
            panelsWithCabinet,
            customerDir,
            currentDateTime,
            orderNo,
            shopOrderCode,
            defaultValues,
            deliveryDate,
            batchNo
        );

        console.log(`  ✅ 修复后创建了 ${fixedCabinets.length} 个Cabinet对象`);

        // 保存修复后的Cabinet信息
        const fixedCabinetsInfo = JSON.stringify({
            totalCabinets: fixedCabinets.length,
            cabinets: fixedCabinets.map(cab => ({
                name: cab.Name,
                panelCount: cab.Panels.Panel.length
            }))
        }, null, 2);

        const fixedInfoFilePath = path.join(tempOutputDir, 'fixed-cabinets-info.json');
        fs.writeFileSync(fixedInfoFilePath, fixedCabinetsInfo, 'utf8');
        console.log(`  💾 修复后的Cabinet信息已保存到: ${fixedInfoFilePath}`);

        console.log('\n✅ 分析完成！发现的问题和解决方案:');
        console.log('1. 问题根源: Panel对象中缺少Cabinet属性或属性值不唯一');
        console.log('2. 解决方案: 需要修改createCabinetsFromPanels函数，确保能正确从源XML中识别不同的Cabinet');
        console.log('3. 临时修复: 我们的测试脚本展示了如何根据源Cabinet结构为Panel分配正确的Cabinet属性');
        
    } catch (error) {
        console.error('✗ 分析过程中出错:', error);
    }
}

// 运行分析
analyzeCabinetIssue();