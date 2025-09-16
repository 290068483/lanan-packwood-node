const fs = require('fs');
const path = require('path');
const { generateTempXml } = require('./src/utils/temp-xml-generator');

// 读取配置文件
const configPath = path.join(__dirname, 'config.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

// 清理XML名称，确保只包含合法字符
function sanitizeXmlName(name) {
    if (typeof name !== 'string') return name;

    // 保留基本字母、数字、下划线、连字符和点
    // 移除所有其他字符
    let sanitized = name.replace(/[^\w\-\.]/g, '');

    // 确保名称不为空
    if (!sanitized) sanitized = 'item';

    // 确保名称不以数字、连字符或点开头
    if (/^[0-9\-\.]/.test(sanitized)) {
        sanitized = 'x' + sanitized;
    }

    return sanitized;
}

// 定义格式化函数，将嵌套对象转换为属性格式
function formatDataForXml(data) {
    // 如果数据已经是数组，直接返回
    if (Array.isArray(data)) {
        return data;
    }

    const formattedData = {};

    // 递归处理数据
    function processItem(item, parentKey = '') {
        // 处理简单值
        if (typeof item === 'string' || typeof item === 'number' || typeof item === 'boolean') {
            return item;
        }

        // 处理数组
        if (Array.isArray(item)) {
            return item.map(subItem => processItem(subItem));
        }

        // 处理对象
        if (typeof item === 'object' && item !== null) {
            const result = {};

            for (const key in item) {
                const sanitizedKey = sanitizeXmlName(key);
                const value = item[key];

                // 如果是嵌套对象且不是特殊标记的属性，则递归处理
                if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
                    // 检查是否是空对象
                    if (Object.keys(value).length === 0) {
                        // 处理空对象，可能应该转换为空数组或空元素
                        result[sanitizedKey] = [];
                    } else {
                        // 检查是否是属性对象（有@_前缀）
                        const hasAttributes = Object.keys(value).some(k => k.startsWith('@_'));
                        if (hasAttributes) {
                            // 保留属性格式，同时清理属性名
                            const attributeResult = {};
                            for (const attrKey in value) {
                                const sanitizedAttrKey = sanitizeXmlName(attrKey);
                                attributeResult[sanitizedAttrKey] = value[attrKey];
                            }
                            result[sanitizedKey] = attributeResult;
                        } else {
                            // 将嵌套对象转换为属性
                            const processedValue = processItem(value, sanitizedKey);
                            if (typeof processedValue === 'object') {
                                result[sanitizedKey] = processedValue;
                            }
                        }
                    }
                } else if (Array.isArray(value)) {
                    // 处理数组
                    result[sanitizedKey] = value.map(subItem => processItem(subItem));
                } else {
                    // 简单值直接赋值
                    result[sanitizedKey] = value;
                }
            }

            return result;
        }

        return item;
    }

    // 处理顶层数据
    for (const key in data) {
        const sanitizedKey = sanitizeXmlName(key);
        formattedData[sanitizedKey] = processItem(data[key], sanitizedKey);
    }

    return formattedData;
}

// 读取真实数据
function loadRealData() {
    try {
        // 从解析后的临时打包目录加载数据
        const tempPackDir = getResolvedPath(config.basePath.projectStorage, config);

        // 检查目录是否存在
        if (!fs.existsSync(tempPackDir)) {
            console.error(`错误: 临时打包目录不存在: ${tempPackDir}`);

            // 尝试创建临时打包目录
            try {
                fs.mkdirSync(tempPackDir, { recursive: true });
                console.log(`✓ 创建临时打包目录: ${tempPackDir}`);
            } catch (mkdirError) {
                console.error(`无法创建临时打包目录: ${mkdirError.message}`);
            }

            // 返回模拟数据
            return loadMockData();
        }

        // 读取packages.json文件
        const packagesFilePath = path.join(tempPackDir, 'packages.json');
        if (!fs.existsSync(packagesFilePath)) {
            console.error(`错误: 未找到packages.json文件: ${packagesFilePath}`);

            // 尝试从其他可能的位置读取数据
            console.log('正在尝试从其他位置读取数据...');

            // 检查是否有其他JSON数据文件
            const dataFiles = fs.readdirSync(tempPackDir).filter(file => file.endsWith('.json'));
            if (dataFiles.length > 0) {
                console.log(`找到 ${dataFiles.length} 个数据文件:`);
                dataFiles.forEach(file => console.log(`  - ${file}`));

                // 尝试使用第一个找到的JSON文件
                const firstDataFile = dataFiles[0];
                const firstDataFilePath = path.join(tempPackDir, firstDataFile);
                try {
                    const data = JSON.parse(fs.readFileSync(firstDataFilePath, 'utf8'));
                    console.log(`尝试从 ${firstDataFile} 加载数据`);

                    // 尝试提取面板数据
                    if (data && Array.isArray(data.panels)) {
                        console.log(`成功加载了 ${data.panels.length} 个面板数据`);
                        return data.panels;
                    } else if (Array.isArray(data)) {
                        console.log(`加载了 ${data.length} 个项目，假设它们是面板数据`);
                        return data;
                    }
                } catch (parseError) {
                    console.error(`解析 ${firstDataFile} 时出错: ${parseError.message}`);
                }
            }

            // 如果没有真实数据，返回模拟数据
            return loadMockData();
        }

        // 读取并解析packages.json
        const packagesData = JSON.parse(fs.readFileSync(packagesFilePath, 'utf8'));

        // 提取面板数据
        if (packagesData && Array.isArray(packagesData.panels)) {
            console.log(`成功加载了 ${packagesData.panels.length} 个面板数据`);
            return packagesData.panels;
        }

        console.error('错误: packages.json中未找到有效的面板数据');
        return loadMockData();
    } catch (error) {
        console.error('读取真实数据时出错:', error.message);
        return loadMockData();
    }
}

// 加载模拟数据
function loadMockData() {
    console.log('使用模拟数据进行测试...');

    // 模拟数据，基于配置文件中的customFileNameFomat
    const mockPanels = [
        {
            Cabinet: "4-106",
            ActualLength: "673.00",
            ActualWidth: "445.00",
            BasicMaterial: "福人精板",
            BasicMaterialCode: "T20240528-005",
            CabinetType: "swingDoorLeafEntity",
            Category: "Door",
            DoorCover: "全盖",
            DoorDirection: "左开",
            EdgeGroupType: "2",
            EdgeGroupTypeName: "四薄",
            EdgeMaterial: "L8082",
            FXFA: "",
            Grain: "H",
            ID: "1007727200733",
            Length: "675.00",
            Material: "L8082",
            ModelName: "门板-平板",
            Name: "门板-平板",
            OrderCountNo: "1-1",
            ProductionLine: "N1产线",
            Thickness: "18.00",
            Type: "1",
            Uid: "4563ba57994339790e752622ba94a700",
            Width: "447.00",
            LabelInfo: {
                FXFA: "",
                ProductionLine: "N1产线",
                生产区域: "",
                生产属性: ""
            },
            Panels: {},
            EdgeGroup: {
                Edge: [
                    { Face: "1", LindID: "1", Thickness: "1.00", EdgeType: "B", Length: "447.00", Pre_Milling: "0.20" },
                    { Face: "2", LindID: "2", Thickness: "1.00", EdgeType: "B", Length: "675.00", Pre_Milling: "0.20" },
                    { Face: "3", LindID: "3", Thickness: "1.00", EdgeType: "B", Length: "447.00", Pre_Milling: "0.20" },
                    { Face: "4", LindID: "4", Thickness: "1.00", EdgeType: "B", Length: "675.00", Pre_Milling: "0.20" }
                ]
            },
            Machines: {
                Machining: [
                    { ID: "007945", Type: "2", Face: "5", X: "46.00", Y: "29.50", Z: "18.00", Diameter: "3.00", Depth: "10.00" },
                    { ID: "007946", Type: "2", Face: "5", X: "94.00", Y: "29.50", Z: "18.00", Diameter: "3.00", Depth: "10.00" },
                    { ID: "007947", Type: "2", Face: "5", X: "70.00", Y: "23.50", Z: "18.00", Diameter: "37.00", Depth: "14.00" }
                ]
            },
            Handles: {},
            ProduceValues: { FXFA: "", 生产区域: "", 生产属性: "" }
        },
        {
            Cabinet: "4-107",
            ActualLength: "673.00",
            ActualWidth: "445.00",
            BasicMaterial: "福人精板",
            BasicMaterialCode: "T20240528-005",
            CabinetType: "swingDoorLeafEntity",
            Category: "Door",
            DoorCover: "全盖",
            DoorDirection: "右开",
            EdgeGroupType: "2",
            EdgeGroupTypeName: "四薄",
            EdgeMaterial: "L8082",
            FXFA: "",
            Grain: "H",
            ID: "1007727200734",
            Length: "675.00",
            Material: "L8082",
            ModelName: "门板-平板",
            Name: "门板-平板",
            OrderCountNo: "1-1",
            ProductionLine: "N1产线",
            Thickness: "18.00",
            Type: "1",
            Uid: "07c2de1f4aa6dd7abfd7ca237cf3cbc8",
            Width: "447.00",
            LabelInfo: {
                FXFA: "",
                ProductionLine: "N1产线",
                生产区域: "",
                生产属性: ""
            },
            Panels: {},
            EdgeGroup: {
                Edge: [
                    { Face: "1", LindID: "1", Thickness: "1.00", EdgeType: "B", Length: "447.00", Pre_Milling: "0.20" },
                    { Face: "2", LindID: "2", Thickness: "1.00", EdgeType: "B", Length: "675.00", Pre_Milling: "0.20" },
                    { Face: "3", LindID: "3", Thickness: "1.00", EdgeType: "B", Length: "447.00", Pre_Milling: "0.20" },
                    { Face: "4", LindID: "4", Thickness: "1.00", EdgeType: "B", Length: "675.00", Pre_Milling: "0.20" }
                ]
            },
            Machines: {
                Machining: [
                    { ID: "007951", Type: "2", Face: "5", X: "94.00", Y: "417.50", Z: "18.00", Diameter: "3.00", Depth: "10.00" },
                    { ID: "007952", Type: "2", Face: "5", X: "46.00", Y: "417.50", Z: "18.00", Diameter: "3.00", Depth: "10.00" },
                    { ID: "007953", Type: "2", Face: "5", X: "70.00", Y: "423.50", Z: "18.00", Diameter: "37.00", Depth: "14.00" }
                ]
            },
            Handles: {},
            ProduceValues: { FXFA: "", 生产区域: "", 生产属性: "" }
        }
    ];

    return mockPanels;
}

// 解析配置文件中的路径变量
function getResolvedPath(pathPattern, config) {
    let resolvedPath = pathPattern;

    // 处理 basePath.workspace
    if (resolvedPath.includes('${basePath.workspace}')) {
        resolvedPath = resolvedPath.replace(/\${basePath\.workspace}/g, config.basePath.workspace);
    }

    // 处理 basePath.projectStorage
    if (resolvedPath.includes('${basePath.projectStorage}')) {
        // 先解析 basePath.projectStorage 内部的变量
        const projectStorage = config.basePath.projectStorage.replace(/\${basePath\.workspace}/g, config.basePath.workspace);
        resolvedPath = resolvedPath.replace(/\${basePath\.projectStorage}/g, projectStorage);
    }

    // 处理 customFileNameFomat
    if (resolvedPath.includes('${customFileNameFomat}')) {
        resolvedPath = resolvedPath.replace(/\$\{customFileNameFomat\}/g, config.customFileNameFomat || '测试输出');
    }

    // 处理 customerName 占位符
    if (resolvedPath.includes('{customerName}')) {
        // 从调用上下文获取customerName，如果没有则使用默认值
        const customerName = global.customerName || '测试客户';
        resolvedPath = resolvedPath.replace(/\{customerName\}/g, customerName);
    }

    // 确保没有剩余的占位符
    resolvedPath = resolvedPath.replace(/{(.*?)}/g, (match, p1) => {
        console.warn(`警告: 路径中未解析的占位符: ${match}`);
        return p1 || '未知';
    });

    return path.resolve(resolvedPath);
}

// 生成XML文件
function generateXml() {
    try {
        // 解析实际的临时打包目录路径
        const tempPackDir = getResolvedPath(config.basePath.projectStorage, config);
        console.log(`临时打包目录: ${tempPackDir}`);

        // 加载数据
        const panels = loadRealData();
        if (!panels || panels.length === 0) {
            console.error('没有可用的数据来生成XML');
            return;
        }

        // 格式化数据
        const formattedPanels = formatDataForXml(panels);

        // 提取客户名称 - 从真实数据中获取
        let customerName = '测试客户';

        // 尝试从面板数据中提取客户名称
        if (panels && panels.length > 0) {
            // 检查面板数据中是否有客户信息字段
            const firstPanel = panels[0];
            if (firstPanel.Customer) {
                customerName = firstPanel.Customer;
            } else if (firstPanel.customer) {
                customerName = firstPanel.customer;
            } else if (firstPanel.Client) {
                customerName = firstPanel.Client;
            } else if (firstPanel.client) {
                customerName = firstPanel.client;
            } else {
                // 如果面板数据中没有客户信息，尝试从数据库获取
                try {
                    const databasePath = path.join(__dirname, 'data', 'database.json');
                    if (fs.existsSync(databasePath)) {
                        const database = JSON.parse(fs.readFileSync(databasePath, 'utf8'));
                        if (database.customers && database.customers.length > 0) {
                            // 使用第一个客户作为默认客户
                            customerName = database.customers[0].name;
                        }
                    }
                } catch (dbError) {
                    console.warn('无法从数据库获取客户名称:', dbError.message);
                }
            }
        }

        // 设置全局customerName变量，用于路径解析
        global.customerName = customerName;

        // 根据配置生成输出路径
        const outputXmlPath = getResolvedPath(config.outputXmlPath, config);

        // 清理全局变量
        delete global.customerName;
        console.log(`解析后的输出路径: ${outputXmlPath}`);

        // 确保输出目录存在
        const outputDir = path.dirname(outputXmlPath);
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
            console.log(`✓ 创建输出目录: ${outputDir}`);
        }

        // 确保panels是数组
        const panelsArray = Array.isArray(formattedPanels) ? formattedPanels : [formattedPanels];

        // 生成XML文件
        console.log(`正在生成XML文件到: ${outputXmlPath}`);
        console.log(`面板数据数量: ${panelsArray.length}`);
        const result = generateTempXml(panelsArray, outputXmlPath, customerName, 'N1产线');

        if (result) {
            console.log(`✓ XML文件生成成功: ${result}`);
            console.log(`生成了 ${panels.length} 个面板的数据`);

            // 验证生成的XML文件
            if (fs.existsSync(result)) {
                const stats = fs.statSync(result);
                console.log(`✓ XML文件大小: ${(stats.size / 1024).toFixed(2)} KB`);
            }
        } else {
            console.error('✗ XML文件生成失败');
        }
    } catch (error) {
        console.error('✗ 生成XML文件时出错:', error.message);
        console.error(error.stack);
    }
}

// 运行程序
console.log('开始生成XML文件...');
console.log(`使用配置文件: ${configPath}`);
console.log(`输出路径: ${config.outputXmlPath}`);
generateXml();