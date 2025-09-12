const { XMLParser, XMLBuilder } = require('fast-xml-parser');
const fs = require('fs');
const path = require('path');
const ExcelJS = require('exceljs');
const xml2js = require('xml2js');
const convert = require('xml-js');
const { DOMParser } = require('xmldom');
const xpath = require('xpath');
const libxmljs = require('libxmljs2');
const { logError, logInfo, logWarning, logSuccess } = require('../utils/logger');

// 读取配置文件
const configPath = path.join(__dirname, '..', '..', 'config.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

// 定义日志函数（如果未从utils/logger导入）
// const logError = (customer, module, message, stack) => {
//     const timestamp = new Date().toISOString();
//     const logEntry = `[${timestamp}] [ERROR] [${customer}] [${module}] ${message}\n`;
//     fs.appendFileSync('error.log', logEntry);
//     if (stack) {
//         fs.appendFileSync('error.log', `${stack}\n`);
//     }
// };

// const logInfo = (customer, module, message) => {
//     const timestamp = new Date().toISOString();
//     const logEntry = `[${timestamp}] [INFO] [${customer}] [${module}] ${message}\n`;
//     console.log(logEntry);
//     fs.appendFileSync('info.log', logEntry);
// };

// const logWarning = (customer, module, message) => {
//     const timestamp = new Date().toISOString();
//     const logEntry = `[${timestamp}] [WARNING] [${customer}] [${module}] ${message}\n`;
//     console.log(logEntry);
//     fs.appendFileSync('warning.log', logEntry);
// };

// const logSuccess = (customer, module, message) => {
//     const timestamp = new Date().toISOString();
//     const logEntry = `[${timestamp}] [SUCCESS] [${customer}] [${module}] ${message}\n`;
//     console.log(logEntry);
//     fs.appendFileSync('success.log', logEntry);
// };

// const logSystemInfo = (message) => {
//     const timestamp = new Date().toISOString();
//     const logEntry = `[${timestamp}] [SYSTEM] [INFO] ${message}\n`;
//     console.log(logEntry);
//     fs.appendFileSync('system.log', logEntry);
// };

// const logSystemError = (message, stack) => {
//     const timestamp = new Date().toISOString();
//     const logEntry = `[${timestamp}] [SYSTEM] [ERROR] ${message}\n`;
//     console.error(logEntry);
//     fs.appendFileSync('system-error.log', logEntry);
//     if (stack) {
//         fs.appendFileSync('system-error.log', `${stack}\n`);
//     }
// };

/**
 * 检查package.json是否发生变化
 * @param {string} outputDir - 输出目录
 * @param {string} customerName - 客户名称
 * @returns {Promise<boolean>} - package.json是否发生变化
 */
async function checkPackageChanged(outputDir, customerName) {
    try {
        // 检查本地package.json文件是否存在，如果不存在则创建
        const localPackagePath = path.join(outputDir, 'package.json');
        if (!fs.existsSync(localPackagePath)) {
            // 创建默认的package.json文件
            const defaultPackage = {
                name: customerName.toLowerCase().replace(/\s+/g, '-'),
                version: "1.0.0",
                description: `Package file for ${customerName}`,
                private: true
            };
            fs.writeFileSync(localPackagePath, JSON.stringify(defaultPackage, null, 2), 'utf8');
            console.log(`✓ 已为客户 "${customerName}" 创建package.json文件`);
            logSuccess(customerName, 'PACKAGE_CHECK', `已创建package.json文件: ${localPackagePath}`);
        }

        // 读取当前package.json的内容
        const packageData = fs.readFileSync(localPackagePath, 'utf8');
        const currentPackageHash = require('crypto')
            .createHash('md5')
            .update(packageData)
            .digest('hex');

        // 检查是否存在之前的package.json哈希值文件
        const packageHashFilePath = path.join(outputDir, 'package.hash');
        if (fs.existsSync(packageHashFilePath)) {
            // 读取之前的哈希值
            const previousPackageHash = fs.readFileSync(packageHashFilePath, 'utf8');
            
            // 比较哈希值
            if (currentPackageHash === previousPackageHash) {
                console.log(`✓ 客户 "${customerName}" package.json未发生变化`);
                logInfo(customerName, 'PACKAGE_CHECK', 'package.json未发生变化');
                return false;
            }
        }

        // 保存当前package.json哈希值
        fs.writeFileSync(packageHashFilePath, currentPackageHash, 'utf8');
        console.log(`✓ 客户 "${customerName}" package.json已更新`);
        logSuccess(customerName, 'PACKAGE_CHECK', 'package.json已更新');
        return true;
    } catch (error) {
        const errorMsg = `检查package.json变化时发生错误: ${error.message}`;
        console.error(`✗ ${errorMsg}`);
        logError(customerName, 'PACKAGE_CHECK', errorMsg, error.stack);
        // 出错时默认package.json已变化
        return true;
    }
}

/**
 * 检查package.json是否发生变化（旧版本）
 * @param {string} outputDir - 输出目录
 * @param {string} customerName - 客户名称
 * @returns {boolean} - package.json是否发生变化
 */
function checkPackageChangedOld(outputDir, customerName) {
    try {
        // 检查本地package.json文件是否存在，如果不存在则创建
        const localPackagePath = path.join(outputDir, 'package.json');
        if (!fs.existsSync(localPackagePath)) {
            // 创建默认的package.json文件
            const defaultPackage = {
                name: customerName.toLowerCase().replace(/\s+/g, '-'),
                version: "1.0.0",
                description: `Package file for ${customerName}`,
                private: true
            };
            fs.writeFileSync(localPackagePath, JSON.stringify(defaultPackage, null, 2), 'utf8');
            console.log(`✓ 已为客户 "${customerName}" 创建package.json文件`);
            logSuccess(customerName, 'PACKAGE_CHECK', `已创建package.json文件: ${localPackagePath}`);
        }

        // 读取当前package.json的内容
        const packageData = fs.readFileSync(localPackagePath, 'utf8');
        const currentPackageHash = require('crypto')
            .createHash('md5')
            .update(packageData)
            .digest('hex');

        // 检查是否存在之前的package.json哈希值文件
        const packageHashFilePath = path.join(outputDir, 'package.hash');
        if (fs.existsSync(packageHashFilePath)) {
            // 读取之前的哈希值
            const previousPackageHash = fs.readFileSync(packageHashFilePath, 'utf8');
            
            // 比较哈希值
            if (currentPackageHash === previousPackageHash) {
                console.log(`✓ 客户 "${customerName}" package.json未发生变化`);
                logInfo(customerName, 'PACKAGE_CHECK', 'package.json未发生变化');
                return false;
            }
        }

        // 保存当前package.json哈希值
        fs.writeFileSync(packageHashFilePath, currentPackageHash, 'utf8');
        console.log(`✓ 客户 "${customerName}" package.json已更新`);
        logSuccess(customerName, 'PACKAGE_CHECK', 'package.json已更新');
        return true;
    } catch (error) {
        const errorMsg = `检查package.json变化时发生错误: ${error.message}`;
        console.error(`✗ ${errorMsg}`);
        logError(customerName, 'PACKAGE_CHECK', errorMsg, error.stack);
        // 出错时默认package.json已变化
        return true;
    }
}

// 配置XML解析器，增加容错性
const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
    textNodeName: "text",
    parseAttributeValue: true,
    parseTagValue: true,
    trimValues: true,
    allowBooleanAttributes: true,
    parseTrueNumberOnly: false,
    // 增加容错配置
    stopNodes: ['*.None', '*.Error'], // 跳过无法解析的节点
    // 忽略解析错误
    ignoreDeclaration: false,
    ignorePiTags: true,
    // 允许重复属性名
    allowDuplicateAttrs: true,
    // 更宽松的解析选项
    removeNSPrefix: true,
    // 处理特殊字符
    htmlEntities: true
});

// 配置宽松的XML解析器，用于处理有问题的文件
const looseParser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
    textNodeName: "text",
    parseAttributeValue: false, // 不强制解析属性值
    parseTagValue: false,       // 不强制解析标签值
    trimValues: true,
    allowBooleanAttributes: true,
    // 更宽松的配置
    stopNodes: ['*.None', '*.Error', '*.Unknown'],
    ignoreDeclaration: true,
    ignorePiTags: true,
    removeNSPrefix: true,
    htmlEntities: true
});

// 配置最宽松的XML解析器
const veryLooseParser = new XMLParser({
    ignoreAttributes: true,
    trimValues: true,
    ignoreDeclaration: true,
    ignorePiTags: true,
    removeNSPrefix: true
});

// 配置XML构建器
const builder = new XMLBuilder({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
    textNodeName: "text",
    suppressEmptyNode: true,
    format: true
});

/**
 * 使用xml2js库解析XML数据
 * @param {string} xmlData - XML数据
 */
function parseXmlWithXml2js(xmlData) {
    return new Promise((resolve, reject) => {
        try {
            const xml2jsParser = new xml2js.Parser({
                explicitArray: false,
                ignoreAttrs: false,
                trim: true,
                explicitRoot: false,
                tagNameProcessors: [xml2js.processors.stripPrefix],
                attrNameProcessors: [xml2js.processors.stripPrefix],
                strict: false // 使用宽松模式
            });
            
            xml2jsParser.parseString(xmlData, (err, result) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(result);
                }
            });
        } catch (error) {
            reject(error);
        }
    });
}

/**
 * 使用xmldom库解析XML数据
 * @param {string} xmlData - XML数据
 */
function parseXmlWithXmldom(xmlData) {
    try {
        const doc = new DOMParser().parseFromString(xmlData, 'text/xml');
        
        // 检查是否有解析错误
        const parserErrors = doc.getElementsByTagName('parsererror');
        if (parserErrors.length > 0) {
            throw new Error(`XML解析错误: ${parserErrors[0].textContent}`);
        }
        
        // 转换为JavaScript对象
        function nodeToObject(node) {
            const obj = {};
            
            // 处理属性
            if (node.attributes && node.attributes.length > 0) {
                obj["@_"] = {};
                for (let i = 0; i < node.attributes.length; i++) {
                    const attr = node.attributes[i];
                    obj["@_"][attr.name] = attr.value;
                }
            }
            
            // 处理子节点
            if (node.childNodes && node.childNodes.length > 0) {
                for (let i = 0; i < node.childNodes.length; i++) {
                    const child = node.childNodes[i];
                    if (child.nodeType === 1) { // 元素节点
                        const childObj = nodeToObject(child);
                        if (obj[child.nodeName]) {
                            // 如果已经存在同名节点，转换为数组
                            if (!Array.isArray(obj[child.nodeName])) {
                                obj[child.nodeName] = [obj[child.nodeName]];
                            }
                            obj[child.nodeName].push(childObj);
                        } else {
                            obj[child.nodeName] = childObj;
                        }
                    } else if (child.nodeType === 3) { // 文本节点
                        const text = child.textContent.trim();
                        if (text) {
                            obj["text"] = text;
                        }
                    }
                }
            }
            
            return obj;
        }
        
        // 从根节点开始转换
        const result = {};
        result[node.nodeName] = nodeToObject(node);
        return result;
    } catch (error) {
        throw new Error(`xmldom解析失败: ${error.message}`);
    }
}

/**
 * 使用libxmljs2库解析XML数据
 * @param {string} xmlData - XML数据
 */
function parseXmlWithLibxmljs(xmlData) {
    try {
        const doc = libxmljs.parseXml(xmlData);
        
        // 转换为JavaScript对象
        function nodeToObject(node) {
            const obj = {};
            
            // 处理属性
            const attrs = node.attrs();
            if (attrs && attrs.length > 0) {
                obj["@_"] = {};
                attrs.forEach(attr => {
                    obj["@_"][attr.name()] = attr.value();
                });
            }
            
            // 处理子节点
            const children = node.childNodes();
            if (children && children.length > 0) {
                children.forEach(child => {
                    if (child.type() === 'element') {
                        const childObj = nodeToObject(child);
                        if (obj[child.name()]) {
                            // 如果已经存在同名节点，转换为数组
                            if (!Array.isArray(obj[child.name()])) {
                                obj[child.name()] = [obj[child.name()]];
                            }
                            obj[child.name()].push(childObj);
                        } else {
                            obj[child.name()] = childObj;
                        }
                    } else if (child.type() === 'text') {
                        const text = child.text().trim();
                        if (text) {
                            obj["text"] = text;
                        }
                    }
                });
            }
            
            return obj;
        }
        
        // 从根节点开始转换
        const root = doc.root();
        const result = {};
        result[root.name()] = nodeToObject(root);
        return result;
    } catch (error) {
        throw new Error(`libxmljs2解析失败: ${error.message}`);
    }
}

/**
 * 清空指定目录下的所有文件
 * @param {string} dirPath - 目录路径
 */
function clearDirectory(dirPath) {
    logInfo('SYSTEM', 'MAIN', `开始清空目录: ${dirPath}`);
    console.log(`  开始清空目录: ${dirPath}`);
    
    try {
        if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath, { recursive: true });
            logInfo('SYSTEM', 'MAIN', `创建目录: ${dirPath}`);
            console.log(`  创建目录: ${dirPath}`);
            return;
        }
        
        const files = fs.readdirSync(dirPath);
        for (const file of files) {
            const filePath = path.join(dirPath, file);
            const stat = fs.statSync(filePath);
            
            if (stat.isDirectory()) {
                // 递归删除子目录
                clearDirectory(filePath);
                fs.rmdirSync(filePath);
            } else {
                // 删除文件
                fs.unlinkSync(filePath);
            }
        }
        
        logSuccess('SYSTEM', 'MAIN', `目录清空完成: ${dirPath}`);
        console.log(`  目录清空完成: ${dirPath}`);
    } catch (error) {
        const errorMsg = `清空目录失败: ${error.message}`;
        logError('SYSTEM', 'MAIN', errorMsg, error.stack);
        console.error(`✗ ${errorMsg}`);
    }
}

/**
 * 配置最宽松的XML解析器，只使用xml-js
 * @param {string} xmlData - XML数据
 */
const xmlJsOptions = {
    compact: true,
    ignoreComment: true,
    ignoreDeclaration: true,
    ignoreInstruction: true,
    trim: true,
    nativeType: false, // 不强制转换类型，避免转换错误
    nativeTypeAttributes: false, // 不强制转换属性类型
    alwaysChildren: true, // 始终包含子元素数组
    alwaysArray: false, // 不强制所有元素为数组
    textFn: undefined, // 不处理文本节点
    instructionFn: undefined, // 不处理处理指令
    doctypeFn: undefined, // 不处理文档类型
    commentFn: undefined, // 不处理注释
    cdataFn: undefined // 不处理CDATA
};

/**
 * 尝试修复XML数据
 * @param {string} xmlData - 原始XML数据
 * @param {string} lineDir - 产线目录名
 * @param {string} customerName - 客户名称
 */
function tryRepairXml(xmlData, lineDir, customerName) {
    logInfo(customerName, lineDir, `开始尝试修复XML数据`);
    console.log(`  开始尝试修复XML数据`);
    
    try {
        // 简单的XML修复尝试
        let repairedXml = xmlData;
        
        // 移除可能导致问题的控制字符
        repairedXml = repairedXml.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
        
        // 尝试修复未闭合的标签
        // 这是一个简化的修复方法，实际应用中可能需要更复杂的逻辑
        
        logSuccess(customerName, lineDir, `XML数据修复完成`);
        console.log(`  XML数据修复完成`);
        
        return repairedXml;
    } catch (error) {
        logError(customerName, lineDir, `XML数据修复失败: ${error.message}`, error.stack);
        console.error(`  XML数据修复失败: ${error.message}`);
        return xmlData; // 返回原始数据
    }
}

/**
 * 分段解析XML数据，跳过错误部分
 * @param {string} xmlData - XML数据
 * @param {string} lineDir - 产线目录名
 * @param {string} customerName - 客户名称
 */
function parseXmlInSegments(xmlData, lineDir, customerName) {
    logInfo(customerName, lineDir, `开始分段解析XML数据`);
    console.log(`  开始分段解析XML数据`);
    
    try {
        // 尝试找到所有Cabinet节点
        const cabinetMatches = xmlData.match(/<Cabinet\s+[^>]*>[\s\S]*?<\/Cabinet>/g);
        if (!cabinetMatches) {
            logWarning(customerName, lineDir, `未找到任何Cabinet节点`);
            console.warn(`  未找到任何Cabinet节点`);
            return { success: false, data: [] };
        }
        
        logInfo(customerName, lineDir, `找到 ${cabinetMatches.length} 个Cabinet节点`);
        console.log(`  找到 ${cabinetMatches.length} 个Cabinet节点`);
        
        const cabinets = [];
        let successCount = 0;
        let failCount = 0;
        
        // 尝试逐个解析Cabinet节点，使用多种解析器
        for (let i = 0; i < cabinetMatches.length; i++) {
            try {
                const cabinetXml = `<Root>${cabinetMatches[i]}</Root>`;
                
                // 首选使用fast-xml-parser最宽松配置
                try {
                    const parsed = veryLooseParser.parse(cabinetXml);
                    if (parsed.Root && parsed.Root.Cabinet) {
                        cabinets.push(parsed.Root.Cabinet);
                        successCount++;
                        continue; // 成功解析，继续下一个Cabinet
                    }
                } catch (error) {
                    // fast-xml-parser解析失败，尝试其他解析器
                }
                
                // 尝试xml2js
                try {
                    const parsed = parseXmlWithXml2js(cabinetXml);
                    if (parsed.Root && parsed.Root.Cabinet) {
                        cabinets.push(parsed.Root.Cabinet);
                        successCount++;
                        continue; // 成功解析，继续下一个Cabinet
                    }
                } catch (error) {
                    // xml2js解析失败，尝试其他解析器
                }
                
                // 尝试xmldom
                try {
                    const parsed = parseXmlWithXmldom(cabinetXml);
                    if (parsed.Root && parsed.Root.Cabinet) {
                        cabinets.push(parsed.Root.Cabinet);
                        successCount++;
                        continue; // 成功解析，继续下一个Cabinet
                    }
                } catch (error) {
                    // xmldom解析失败，尝试其他解析器
                }
                
                // 尝试libxmljs2
                try {
                    const parsed = parseXmlWithLibxmljs(cabinetXml);
                    if (parsed.Root && parsed.Root.Cabinet) {
                        cabinets.push(parsed.Root.Cabinet);
                        successCount++;
                        continue; // 成功解析，继续下一个Cabinet
                    }
                } catch (error) {
                    // libxmljs2解析失败
                }
                
                // 所有解析器都失败
                failCount++;
                logWarning(customerName, lineDir, `解析第 ${i+1} 个Cabinet节点失败: 所有解析器都失败`);
                console.warn(`  解析第 ${i+1} 个Cabinet节点失败: 所有解析器都失败`);
            } catch (segmentError) {
                failCount++;
                logWarning(customerName, lineDir, `解析第 ${i+1} 个Cabinet节点失败: ${segmentError.message}`);
                console.warn(`  解析第 ${i+1} 个Cabinet节点失败: ${segmentError.message}`);
            }
        }
        
        logInfo(customerName, lineDir, `分段解析完成: 成功 ${successCount}, 失败 ${failCount}`);
        console.log(`  分段解析完成: 成功 ${successCount}, 失败 ${failCount}`);
        
        return { success: true, data: cabinets };
    } catch (error) {
        logError(customerName, lineDir, `分段解析失败: ${error.message}`, error.stack);
        console.error(`  分段解析失败: ${error.message}`);
        return { success: false, error: error.message };
    }
}

/**
 * 直接从XML文本中提取Panels和Panel节点
 * @param {string} xmlData - XML数据
 * @param {string} lineDir - 产线目录名
 * @param {string} customerName - 客户名称
 */
function extractPanelsDirectly(xmlData, lineDir, customerName) {
    logInfo(customerName, lineDir, `开始直接提取Panels和Panel节点`);
    console.log(`  开始直接提取Panels和Panel节点`);
    
    try {
        // 使用正则表达式直接提取Panel节点
        const panelMatches = xmlData.match(/<Panel\s+[^>]*>[\s\S]*?<\/Panel>/g);
        if (!panelMatches) {
            logWarning(customerName, lineDir, `未找到任何Panel节点`);
            console.warn(`  未找到任何Panel节点`);
            return { success: false, data: [] };
        }
        
        logInfo(customerName, lineDir, `找到 ${panelMatches.length} 个Panel节点`);
        console.log(`  找到 ${panelMatches.length} 个Panel节点`);
        
        const panels = [];
        let successCount = 0;
        let failCount = 0;
        
        // 尝试逐个解析Panel节点，使用多种解析器
        for (let i = 0; i < panelMatches.length; i++) {
            try {
                const panelXml = `<Root>${panelMatches[i]}</Root>`;
                
                // 首选使用fast-xml-parser最宽松配置
                try {
                    const parsed = veryLooseParser.parse(panelXml);
                    if (parsed.Root && parsed.Root.Panel) {
                        panels.push(parsed.Root.Panel);
                        successCount++;
                        continue; // 成功解析，继续下一个Panel
                    }
                } catch (error) {
                    // fast-xml-parser解析失败，尝试其他解析器
                }
                
                // 尝试xml2js
                try {
                    const parsed = parseXmlWithXml2js(panelXml);
                    if (parsed.Root && parsed.Root.Panel) {
                        panels.push(parsed.Root.Panel);
                        successCount++;
                        continue; // 成功解析，继续下一个Panel
                    }
                } catch (error) {
                    // xml2js解析失败，尝试其他解析器
                }
                
                // 尝试xmldom
                try {
                    const parsed = parseXmlWithXmldom(panelXml);
                    if (parsed.Root && parsed.Root.Panel) {
                        panels.push(parsed.Root.Panel);
                        successCount++;
                        continue; // 成功解析，继续下一个Panel
                    }
                } catch (error) {
                    // xmldom解析失败，尝试其他解析器
                }
                
                // 尝试libxmljs2
                try {
                    const parsed = parseXmlWithLibxmljs(panelXml);
                    if (parsed.Root && parsed.Root.Panel) {
                        panels.push(parsed.Root.Panel);
                        successCount++;
                        continue; // 成功解析，继续下一个Panel
                    }
                } catch (error) {
                    // libxmljs2解析失败
                }
                
                // 所有解析器都失败
                failCount++;
                logWarning(customerName, lineDir, `解析第 ${i+1} 个Panel节点失败: 所有解析器都失败`);
                console.warn(`  解析第 ${i+1} 个Panel节点失败: 所有解析器都失败`);
            } catch (panelError) {
                failCount++;
                logWarning(customerName, lineDir, `解析第 ${i+1} 个Panel节点失败: ${panelError.message}`);
                console.warn(`  解析第 ${i+1} 个Panel节点失败: ${panelError.message}`);
            }
        }
        
        logInfo(customerName, lineDir, `Panel节点提取完成: 成功 ${successCount}, 失败 ${failCount}`);
        console.log(`  Panel节点提取完成: 成功 ${successCount}, 失败 ${failCount}`);
        
        // 构造模拟的Cabinet结构
        const cabinetStructure = {
            Panels: {
                Panel: panels
            }
        };
        
        return { success: true, data: [cabinetStructure] };
    } catch (error) {
        logError(customerName, lineDir, `直接提取Panel节点失败: ${error.message}`, error.stack);
        console.error(`  直接提取Panel节点失败: ${error.message}`);
        return { success: false, error: error.message };
    }
}

/**
 * 尝试使用不同解析器解析XML数据
 * @param {string} xmlData - XML数据
 * @param {string} lineDir - 产线目录名
 * @param {string} customerName - 客户名称
 */
function parseXmlWithFallback(xmlData, lineDir, customerName) {
    // 首选方案：使用fast-xml-parser最宽松配置解析整个XML文件
    try {
        logInfo(customerName, lineDir, `尝试使用fast-xml-parser最宽松配置解析XML`);
        console.log(`  尝试使用fast-xml-parser最宽松配置解析XML`);
        const data = veryLooseParser.parse(xmlData);
        return { success: true, data: data, parser: 'fast-xml-parser (very loose)' };
    } catch (error) {
        logWarning(customerName, lineDir, `fast-xml-parser最宽松配置解析失败: ${error.message}`);
        console.warn(`  fast-xml-parser最宽松配置解析失败: ${error.message}`);
        
        // 备选方案1：如果首选方案失败，尝试其他解析器（xml2js, xmldom, libxmljs2）
        try {
            logInfo(customerName, lineDir, `尝试使用xml2js解析器解析XML`);
            console.log(`  尝试使用xml2js解析器解析XML`);
            const data = parseXmlWithXml2js(xmlData);
            return { success: true, data: data, parser: 'xml2js' };
        } catch (xml2jsError) {
            logWarning(customerName, lineDir, `xml2js解析器失败: ${xml2jsError.message}`);
            console.warn(`  xml2js解析器失败: ${xml2jsError.message}`);
            
            try {
                logInfo(customerName, lineDir, `尝试使用xmldom解析器解析XML`);
                console.log(`  尝试使用xmldom解析器解析XML`);
                const data = parseXmlWithXmldom(xmlData);
                return { success: true, data: data, parser: 'xmldom' };
            } catch (xmldomError) {
                logWarning(customerName, lineDir, `xmldom解析器失败: ${xmldomError.message}`);
                console.warn(`  xmldom解析器失败: ${xmldomError.message}`);
                
                try {
                    logInfo(customerName, lineDir, `尝试使用libxmljs2解析器解析XML`);
                    console.log(`  尝试使用libxmljs2解析器解析XML`);
                    const data = parseXmlWithLibxmljs(xmlData);
                    return { success: true, data: data, parser: 'libxmljs2' };
                } catch (libxmljsError) {
                    logWarning(customerName, lineDir, `libxmljs2解析器失败: ${libxmljsError.message}`);
                    console.warn(`  libxmljs2解析器失败: ${libxmljsError.message}`);
                    
                    // 备选方案2：如果所有解析器都失败，尝试修复XML数据后再次使用首选方案，如果首选方案失败，尝试其他解析器
                    try {
                        logInfo(customerName, lineDir, `尝试修复XML数据`);
                        console.log(`  尝试修复XML数据`);
                        const repairedXml = tryRepairXml(xmlData, lineDir, customerName);
                        
                        // 修复后再次尝试首选方案
                        try {
                            logInfo(customerName, lineDir, `尝试使用修复后的XML数据和fast-xml-parser最宽松配置再次解析`);
                            console.log(`  尝试使用修复后的XML数据和fast-xml-parser最宽松配置再次解析`);
                            const data = veryLooseParser.parse(repairedXml);
                            return { success: true, data: data, parser: 'fast-xml-parser (very loose, repaired)' };
                        } catch (repairedError) {
                            logWarning(customerName, lineDir, `修复后fast-xml-parser最宽松配置解析仍失败: ${repairedError.message}`);
                            console.warn(`  修复后fast-xml-parser最宽松配置解析仍失败: ${repairedError.message}`);
                            
                            // 修复后尝试其他解析器
                            try {
                                logInfo(customerName, lineDir, `尝试使用修复后的XML数据和xml2js再次解析`);
                                console.log(`  尝试使用修复后的XML数据和xml2js再次解析`);
                                const data = parseXmlWithXml2js(repairedXml);
                                return { success: true, data: data, parser: 'xml2js (repaired)' };
                            } catch (repairedXml2jsError) {
                                logWarning(customerName, lineDir, `修复后xml2js解析仍失败: ${repairedXml2jsError.message}`);
                                console.warn(`  修复后xml2js解析仍失败: ${repairedXml2jsError.message}`);
                                
                                try {
                                    logInfo(customerName, lineDir, `尝试使用修复后的XML数据和xmldom再次解析`);
                                    console.log(`  尝试使用修复后的XML数据和xmldom再次解析`);
                                    const data = parseXmlWithXmldom(repairedXml);
                                    return { success: true, data: data, parser: 'xmldom (repaired)' };
                                } catch (repairedXmldomError) {
                                    logWarning(customerName, lineDir, `修复后xmldom解析仍失败: ${repairedXmldomError.message}`);
                                    console.warn(`  修复后xmldom解析仍失败: ${repairedXmldomError.message}`);
                                    
                                    try {
                                        logInfo(customerName, lineDir, `尝试使用修复后的XML数据和libxmljs2再次解析`);
                                        console.log(`  尝试使用修复后的XML数据和libxmljs2再次解析`);
                                        const data = parseXmlWithLibxmljs(repairedXml);
                                        return { success: true, data: data, parser: 'libxmljs2 (repaired)' };
                                    } catch (repairedLibxmljsError) {
                                        logWarning(customerName, lineDir, `修复后libxmljs2解析仍失败: ${repairedLibxmljsError.message}`);
                                        console.warn(`  修复后libxmljs2解析仍失败: ${repairedLibxmljsError.message}`);
                                        
                                        // 备选方案3：如果修复后仍失败，尝试分段解析
                                        try {
                                            logInfo(customerName, lineDir, `尝试分段解析XML数据`);
                                            console.log(`  尝试分段解析XML数据`);
                                            const segmentResult = parseXmlInSegments(xmlData, lineDir, customerName);
                                            if (segmentResult.success) {
                                                // 构造完整的数据结构
                                                const fullData = {
                                                    Root: {
                                                        Cabinet: segmentResult.data
                                                    }
                                                };
                                                return { success: true, data: fullData, parser: 'segmented' };
                                            }
                                        } catch (segmentError) {
                                            logWarning(customerName, lineDir, `分段解析也失败: ${segmentError.message}`);
                                            console.warn(`  分段解析也失败: ${segmentError.message}`);
                                            
                                            // 备选方案4：如果分段解析也失败，直接提取关键节点（Panels和Panel）
                                            try {
                                                logInfo(customerName, lineDir, `尝试直接查找Panels和Panel节点`);
                                                console.log(`  尝试直接查找Panels和Panel节点`);
                                                const panelResult = extractPanelsDirectly(xmlData, lineDir, customerName);
                                                if (panelResult.success) {
                                                    // 构造完整的数据结构
                                                    const fullData = {
                                                        Root: {
                                                            Cabinet: panelResult.data
                                                        }
                                                    };
                                                    return { success: true, data: fullData, parser: 'direct panels' };
                                                }
                                            } catch (panelError) {
                                                logWarning(customerName, lineDir, `直接查找Panels和Panel节点也失败: ${panelError.message}`);
                                                console.warn(`  直接查找Panels和Panel节点也失败: ${panelError.message}`);
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    } catch (repairError) {
                        logWarning(customerName, lineDir, `XML数据修复失败: ${repairError.message}`);
                        console.warn(`  XML数据修复失败: ${repairError.message}`);
                    }
                }
            }
        }
        
        // 最终方案：如果以上方案都失败，记录详细错误日志并跳过该文件
        logError(customerName, lineDir, `所有XML解析方法都失败`, error.stack);
        console.error(`  所有XML解析方法都失败`);
        return { success: false, error: error.message };
    }
}

/**
 * 从解析后的数据中提取Panel数据
 * @param {Object} parsedData - 解析后的数据
 * @param {string} xmlData - 原始XML数据
 * @param {string} customerName - 客户名称
 * @param {string} lineDir - 产线目录名
 * @returns {Array} - 提取的Panel数据
 */
function extractPanelsFromParsedData(parsedData, xmlData, customerName, lineDir) {
    try {
        let cabinets = [];
        
        // 尝试从标准结构中提取数据
        if (parsedData && parsedData.Root && parsedData.Root.Cabinet) {
            logInfo(customerName, lineDir, `解析后数据结构关键字段: ${Object.keys(parsedData.Root)}`);
            
            // 处理Cabinet数据
            let cabinetData = parsedData.Root.Cabinet;
            if (!Array.isArray(cabinetData)) {
                cabinetData = [cabinetData];
            }
            
            // 遍历每个Cabinet
            cabinetData.forEach((cabinet, index) => {
                // 确保Cabinet有Panels和Panel数据
                if (cabinet && cabinet.Panels && cabinet.Panels.Panel) {
                    // 确保返回完整的cabinet结构
                    cabinets.push(cabinet);
                }
            });
        }
        
        // 如果标准结构中没有找到Panel，尝试直接从XML文本中提取
        if (cabinets.length === 0) {
            logInfo(customerName, lineDir, '尝试直接从XML文本中提取Panel节点');
            
            // 使用正则表达式匹配Panel节点
            const panelMatches = xmlData.match(/<Panel\s+[^>]*>[\s\S]*?<\/Panel>/g);
            if (panelMatches && panelMatches.length > 0) {
                console.log(`ℹ ${customerName} 从XML文本中找到 ${panelMatches.length} 个Panel节点`);
                logInfo(customerName, lineDir, `从XML文本中找到 ${panelMatches.length} 个Panel节点`);
                
                // 逐个解析Panel节点
                let parsedPanels = [];
                let successfullyParsed = 0;
                
                for (let i = 0; i < Math.min(panelMatches.length, 20); i++) { // 限制解析前20个以避免过多日志
                    try {
                        const panelXml = `<Root>${panelMatches[i]}</Root>`;
                        const panelData = parser.parse(panelXml);
                        if (panelData && panelData.Root && panelData.Root.Panel) {
                            parsedPanels.push(panelData.Root.Panel);
                            successfullyParsed++;
                        }
                    } catch (parseError) {
                        // 忽略单个Panel解析错误
                    }
                }
                
                console.log(`ℹ ${customerName} 成功解析 ${successfullyParsed} 个Panel节点`);
                logInfo(customerName, lineDir, `成功解析 ${successfullyParsed} 个Panel节点`);
                
                if (parsedPanels.length > 0) {
                    // 创建一个虚拟的Cabinet结构
                    cabinets.push({
                        Panels: {
                            Panel: parsedPanels
                        }
                    });
                }
            }
        }
        
        return cabinets;
    } catch (error) {
        const errorMsg = `提取Panel数据时发生错误: ${error.message}`;
        console.error(`✗ ${errorMsg}`);
        logError(customerName, lineDir, errorMsg, error.stack);
        return [];
    }
}

/**
 * 自动检测并处理所有客户产线数据
 */
async function autoDetectAndProcessLines() {
    try {
        // 读取配置文件
        const config = JSON.parse(fs.readFileSync('config.json', 'utf8'));
        
        // 清空本地路径中的所有内容
        if (fs.existsSync(config.localPath)) {
            fs.rmSync(config.localPath, { recursive: true, force: true });
        }
        fs.mkdirSync(config.localPath, { recursive: true });
        
        // 获取所有客户目录
        const customerDirs = fs.readdirSync(config.sourcePath).filter(file => 
            fs.statSync(path.join(config.sourcePath, file)).isDirectory()
        );
        
        console.log(`✓ 检测到 ${customerDirs.length} 个客户目录:`, customerDirs);
        console.log(`✓ [SYSTEM] 检测到 ${customerDirs.length} 个客户目录: ${customerDirs.join(', ')}`);
        
        // 依次处理每个客户
        for (const customerDir of customerDirs) {
            console.log(`\n正在处理客户: ${customerDir}`);
            logInfo(customerDir, 'MAIN', `开始处理客户`);
            
            try {
                // 为客户创建输出目录
                const customerOutputDir = path.join(config.localPath, customerDir);
                fs.mkdirSync(customerOutputDir, { recursive: true });
                
                // 检查package.json是否发生变化
                const isPackageChanged = await checkPackageChanged(customerOutputDir, customerDir);
                
                // 处理客户数据
                const success = await processCustomerData(
                    path.join(config.sourcePath, customerDir, '设备文件'), 
                    customerOutputDir, 
                    customerDir,
                    isPackageChanged
                );
                
                if (success) {
                    console.log(`✓ 客户 "${customerDir}" 处理成功`);
                    logSuccess(customerDir, 'MAIN', '客户处理成功');
                } else {
                    console.log(`✗ 客户 "${customerDir}" 处理失败`);
                    logError(customerDir, 'MAIN', '客户处理失败');
                }
            } catch (error) {
                console.error(`✗ 处理客户 "${customerDir}" 时发生错误:`, error.message);
                logError(customerDir, 'MAIN', `处理客户时发生错误: ${error.message}`, error.stack);
            }
        }
        
        console.log('\n✓ 处理完成，共处理了 %d 个客户', customerDirs.length);
        console.log(`✓ [SYSTEM] 处理完成，共处理了 ${customerDirs.length} 个客户`);
    } catch (error) {
        console.error('✗ 自动检测并处理产线数据时发生错误:', error.message);
        console.error(`✗ [SYSTEM] 自动检测并处理产线数据时发生错误: ${error.message}`);
    }
}

/**
 * 处理单个客户数据
 * @param {string} customerDevicePath - 客户设备文件路径
 * @param {string} customerOutputDir - 客户输出目录
 * @param {string} customerName - 客户名称
 * @param {boolean} isPackageChanged - package.json是否发生变化
 */
async function processCustomerData(customerDevicePath, customerOutputDir, customerName, isPackageChanged) {
    try {
        // 检查客户设备文件路径是否存在
        if (!fs.existsSync(customerDevicePath)) {
            console.log(`⚠ 客户 "${customerName}" 的设备文件路径不存在: ${customerDevicePath}`);
            logWarning(customerName, 'MAIN', `设备文件路径不存在: ${customerDevicePath}`);
            return false;
        }
        
        // 获取所有产线目录
        const productionLineDirs = fs.readdirSync(customerDevicePath).filter(file => 
            fs.statSync(path.join(customerDevicePath, file)).isDirectory()
        );
        
        if (productionLineDirs.length === 0) {
            console.log(`⚠ 客户 "${customerName}" 没有找到任何产线目录`);
            logWarning(customerName, 'MAIN', '没有找到任何产线目录');
            return false;
        }
        
        console.log(`✓ 检测到 ${productionLineDirs.length} 个产线目录:`, productionLineDirs);
        logSuccess(customerName, 'MAIN', `检测到 ${productionLineDirs.length} 个产线目录: ${productionLineDirs.join(', ')}`);
        
        // 收集所有产线的Cabinet数据
        let allCabinets = [];
        
        // 遍历所有产线目录
        for (const lineDir of productionLineDirs) {
            const xmlFilePath = path.join(customerDevicePath, lineDir, '0、排版文件', '优化文件.xml');
            
            // 检查文件是否存在
            if (!fs.existsSync(xmlFilePath)) {
                console.log(`⚠ 产线 "${lineDir}" 的XML文件不存在: ${xmlFilePath}`);
                logWarning(customerName, 'XML_PROCESSING', `XML文件不存在: ${xmlFilePath}`);
                continue;
            }
            
            try {
                console.log(`✓ 正在读取产线 "${lineDir}" 的XML文件: ${xmlFilePath}`);
                logInfo(customerName, 'XML_PROCESSING', `正在读取XML文件: ${xmlFilePath}`);
                
                // 读取XML文件
                const xmlData = fs.readFileSync(xmlFilePath, 'utf8');
                console.log(`✓ 成功读取XML文件，大小: ${xmlData.length} 字符`);
                logSuccess(customerName, 'XML_READ', `成功读取XML文件，大小: ${xmlData.length} 字符`);
                
                // 尝试不同的解析器解析XML数据
                let parsedData = null;
                const parserConfigs = [
                    {
                        name: 'standard',
                        options: {
                            ignoreAttributes: false,
                            attributeNamePrefix: "@_",
                            textNodeName: "text",
                            parseAttributeValue: true,
                            parseTagValue: true,
                            trimValues: true
                        }
                    },
                    {
                        name: 'loose',
                        options: {
                            ignoreAttributes: false,
                            attributeNamePrefix: "@_",
                            textNodeName: "text",
                            parseAttributeValue: true,
                            parseTagValue: true,
                            trimValues: true,
                            allowBooleanAttributes: true,
                            parseTrueNumberOnly: false
                        }
                    },
                    {
                        name: 'most-loose',
                        options: {
                            ignoreAttributes: false,
                            attributeNamePrefix: "@_",
                            textNodeName: "text",
                            parseAttributeValue: false,
                            parseTagValue: false,
                            trimValues: true,
                            allowBooleanAttributes: true,
                            parseTrueNumberOnly: false,
                            removeNSPrefix: true
                        }
                    }
                ];
                
                // 尝试不同的解析器配置
                for (const parserConfig of parserConfigs) {
                    try {
                        console.log(`ℹ [${customerName}] 尝试使用fast-xml-parser${parserConfig.name === 'standard' ? '标准' : parserConfig.name === 'loose' ? '宽松' : '最宽松'}解析器解析XML`);
                        logInfo(customerName, 'XML_PARSE', `尝试使用fast-xml-parser${parserConfig.name === 'standard' ? '标准' : parserConfig.name === 'loose' ? '宽松' : '最宽松'}解析器解析XML`);
                        
                        const parser = new XMLParser(parserConfig.options);
                        parsedData = parser.parse(xmlData);
                        
                        // 检查是否成功解析
                        if (parsedData && Object.keys(parsedData).length > 0) {
                            console.log(`ℹ [${customerName}] 解析后数据结构关键字段: ${Object.keys(parsedData).join(',')}`);
                            logInfo(customerName, 'XML_PARSE', `解析后数据结构关键字段: ${Object.keys(parsedData).join(',')}`);
                            break;
                        }
                    } catch (parseError) {
                        console.log(`⚠ [${customerName}] fast-xml-parser${parserConfig.name === 'standard' ? '标准' : parserConfig.name === 'loose' ? '宽松' : '最宽松'}解析器失败: ${parseError.message}`);
                        logWarning(customerName, 'XML_PARSE', `fast-xml-parser${parserConfig.name === 'standard' ? '标准' : parserConfig.name === 'loose' ? '宽松' : '最宽松'}解析器失败: ${parseError.message}`);
                    }
                }
                
                // 如果fast-xml-parser所有配置都失败，尝试xml2js
                if (!parsedData || Object.keys(parsedData).length === 0) {
                    try {
                        console.log(`ℹ [${customerName}] 尝试使用xml2js解析器解析XML`);
                        logInfo(customerName, 'XML_PARSE', '尝试使用xml2js解析器解析XML');
                        
                        const xml2js = require('xml2js');
                        parsedData = await new Promise((resolve, reject) => {
                            xml2js.parseString(xmlData, {
                                explicitArray: false,
                                ignoreAttrs: false,
                                attrNameProcessors: [function(name) { return '@_' + name; }]
                            }, (err, result) => {
                                if (err) {
                                    reject(err);
                                } else {
                                    resolve(result);
                                }
                            });
                        });
                        
                        console.log(`✓ [${customerName}] xml2js解析成功`);
                        logSuccess(customerName, 'XML_PARSE', 'xml2js解析成功');
                    } catch (xml2jsError) {
                        console.log(`⚠ [${customerName}] xml2js解析器也失败: ${xml2jsError.message}`);
                        logWarning(customerName, 'XML_PARSE', `xml2js解析器也失败: ${xml2jsError.message}`);
                    }
                }
                
                // 如果xml2js也失败，尝试直接从XML文本中提取Panel节点
                if (!parsedData || Object.keys(parsedData).length === 0) {
                    try {
                        console.log(`ℹ [${customerName}] 尝试直接从XML文本中提取Panel节点`);
                        logInfo(customerName, 'XML_PARSE', '尝试直接从XML文本中提取Panel节点');
                        
                        // 使用正则表达式匹配Panel节点
                        const panelMatches = xmlData.match(/<Panel\s+[^>]*>[\s\S]*?<\/Panel>/g);
                        if (panelMatches && panelMatches.length > 0) {
                            console.log(`ℹ ${customerName} 从XML文本中找到 ${panelMatches.length} 个Panel节点`);
                            logInfo(customerName, 'XML_PARSE', `从XML文本中找到 ${panelMatches.length} 个Panel节点`);
                            
                            // 逐个解析Panel节点
                            const panels = [];
                            const parser = new XMLParser({
                                ignoreAttributes: false,
                                attributeNamePrefix: "@_",
                                textNodeName: "text",
                                parseAttributeValue: true,
                                parseTagValue: true,
                                trimValues: true
                            });
                            
                            // 限制解析数量以避免性能问题
                            const parseLimit = Math.min(panelMatches.length, 20);
                            for (let i = 0; i < parseLimit; i++) {
                                try {
                                    const panelParsed = parser.parse(panelMatches[i]);
                                    if (panelParsed && panelParsed.Panel) {
                                        panels.push(panelParsed.Panel);
                                    }
                                } catch (panelParseError) {
                                    // 忽略单个Panel解析错误
                                }
                            }
                            
                            console.log(`ℹ ${customerName} 成功解析 ${panels.length} 个Panel节点`);
                            logInfo(customerName, 'XML_PARSE', `成功解析 ${panels.length} 个Panel节点`);
                            
                            // 构造一个模拟的数据结构
                            if (panels.length > 0) {
                                parsedData = {
                                    Root: {
                                        Cabinet: {
                                            Panels: {
                                                Panel: panels
                                            }
                                        }
                                    }
                                };
                            }
                        }
                    } catch (directParseError) {
                        console.log(`⚠ [${customerName}] 直接从XML文本提取Panel节点也失败: ${directParseError.message}`);
                        logWarning(customerName, 'XML_PARSE', `直接从XML文本提取Panel节点也失败: ${directParseError.message}`);
                    }
                }
                
                // 获取Cabinet数据
                let cabinets = [];
                if (parsedData && parsedData.Root && parsedData.Root.Cabinet) {
                    cabinets = parsedData.Root.Cabinet;
                }
                
                // 确保cabinets是数组格式
                if (!Array.isArray(cabinets)) {
                    cabinets = [cabinets];
                }
                
                // 过滤掉空的cabinet对象
                cabinets = cabinets.filter(cabinet => cabinet && Object.keys(cabinet).length > 0);
                
                if (cabinets.length > 0) {
                    // 将当前产线的Cabinet数据添加到总数组中
                    allCabinets = allCabinets.concat(cabinets);
                    
                    console.log(`✓ 产线 "${lineDir}" 包含 ${cabinets.length} 个Panel`);
                    logSuccess(customerName, 'XML_PROCESSING', `包含 ${cabinets.length} 个Panel`);
                } else {
                    console.log(`⚠ 警告: 产线 "${lineDir}" 未找到有效的Cabinet节点`);
                    logWarning(customerName, 'XML_PROCESSING', `产线 "${lineDir}" 未找到有效的Cabinet节点`);
                }
            } catch (error) {
                console.error(`✗ 处理产线 "${lineDir}" 的XML文件时出错:`, error.message);
                logError(customerName, 'XML_PROCESSING', `处理产线 "${lineDir}" 的XML文件时出错: ${error.message}`, error.stack);
                // 不立即退出，继续处理其他产线
            }
        }
        
        if (allCabinets.length === 0) {
            console.error('✗ 未能从任何产线获取到Cabinet数据');
            logError(customerName, 'MAIN', '未能从任何产线获取到Cabinet数据');
            return false;
        }
        
        console.log(`\n✓ 总共收集到 ${allCabinets.length} 个Cabinet数据`);
        logSuccess(customerName, 'MAIN', `总共收集到 ${allCabinets.length} 个Cabinet数据`);
        
        // 检查数据是否发生变化
        const isDataChanged = await checkDataChanged(allCabinets, customerOutputDir, customerName);
        if (!isDataChanged) {
            console.log(`ℹ 客户 "${customerName}" 数据未发生变化，跳过生成文件`);
            logInfo(customerName, 'MAIN', '数据未发生变化，跳过生成文件');
            return true;
        }
        
        // 生成简化版XML文件
        try {
            // 读取原始XML文件内容用于生成简化版XML
            const firstLineDir = productionLineDirs[0];
            const firstXmlFilePath = path.join(customerDevicePath, firstLineDir, '0、排版文件', '优化文件.xml');
            if (fs.existsSync(firstXmlFilePath)) {
                const xmlData = fs.readFileSync(firstXmlFilePath, 'utf8');
                const parser = new XMLParser({
                    ignoreAttributes: false,
                    attributeNamePrefix: "@_",
                    textNodeName: "text",
                    parseAttributeValue: true,
                    parseTagValue: true,
                    trimValues: true
                });
                const customerData = parser.parse(xmlData);
                await generateSimplifiedXml(customerData, customerOutputDir, customerName);
            }
        } catch (error) {
            console.error('✗ 生成简化版XML文件时出错:', error.message);
            logError(customerName, 'XML_GENERATION', `生成简化版XML文件时出错: ${error.message}`, error.stack);
        }
        
        // 生成Excel文件
        try {
            const result = await generateExcel(allCabinets, customerName, customerOutputDir, isPackageChanged);
            if (result && result.success) {
                console.log(`✓ Excel文件生成成功`);
                logSuccess(customerName, 'EXCEL_GENERATION', 'Excel文件生成成功');
                return true;
            } else {
                console.error('✗ Excel文件生成失败');
                logError(customerName, 'EXCEL_GENERATION', 'Excel文件生成失败');
                return false;
            }
        } catch (error) {
            console.error('✗ 生成Excel文件时出错:', error.message);
            logError(customerName, 'EXCEL_GENERATION', `生成Excel文件时出错: ${error.message}`, error.stack);
            return false;
        }
    } catch (error) {
        console.error('✗ 处理客户数据时发生未知错误:', error.message);
        logError(customerName, 'MAIN', `处理客户数据时发生未知错误: ${error.message}`, error.stack);
        return false;
    }
}

/**
 * 生成简化版XML文件（删除不需要的标签结构）
 * @param {Object} customerData - 客户完整数据
 * @param {string} outputDir - 输出目录
 * @param {string} customerName - 客户名称
 */
async function generateSimplifiedXml(customerData, outputDir, customerName) {
    try {
        // 删除不需要的标签结构
        if (customerData && customerData.Root) {
            // 删除Metals节点
            if (customerData.Root.Metals) {
                delete customerData.Root.Metals;
                console.log('✓ 已删除Metals节点');
                logSuccess(customerName, 'XML_GENERATION', '已删除Metals节点');
            }
            
            // 删除Hardwares节点
            if (customerData.Root.Hardwares) {
                delete customerData.Root.Hardwares;
                console.log('✓ 已删除Hardwares节点');
                logSuccess(customerName, 'XML_GENERATION', '已删除Hardwares节点');
            }
            
            // 删除ExtendBomLists节点
            if (customerData.Root.ExtendBomLists) {
                delete customerData.Root.ExtendBomLists;
                console.log('✓ 已删除ExtendBomLists节点');
                logSuccess(customerName, 'XML_GENERATION', '已删除ExtendBomLists节点');
            }
            
            // 只保留必要的 Cabinet 数据
            if (customerData.Root.Cabinet) {
                // 如果是数组，处理每个 Cabinet
                if (Array.isArray(customerData.Root.Cabinet)) {
                    customerData.Root.Cabinet = customerData.Root.Cabinet.map(cabinet => {
                        // 删除 Cabinet 中的 Metals, Hardwares 和 ExtendBomLists（如果存在）
                        if (cabinet.Metals) {
                            delete cabinet.Metals;
                        }
                        if (cabinet.Hardwares) {
                            delete cabinet.Hardwares;
                        }
                        if (cabinet.ExtendBomLists) {
                            delete cabinet.ExtendBomLists;
                        }
                        return cabinet;
                    });
                } else {
                    // 单个 Cabinet 对象
                    if (customerData.Root.Cabinet.Metals) {
                        delete customerData.Root.Cabinet.Metals;
                    }
                    if (customerData.Root.Cabinet.Hardwares) {
                        delete customerData.Root.Cabinet.Hardwares;
                    }
                    if (customerData.Root.Cabinet.ExtendBomLists) {
                        delete customerData.Root.Cabinet.ExtendBomLists;
                    }
                }
            }
        }
        
        // 构建简化版XML
        const simplifiedXml = builder.build(customerData);
        
        // 生成输出文件名
        const outputFileName = path.join(outputDir, 'temp.xml');
        
        // 保存为XML文件
        fs.writeFileSync(outputFileName, simplifiedXml, 'utf8');
        console.log(`✓ 简化版XML文件已生成到 ${outputFileName}`);
        logSuccess(customerName, 'XML_GENERATION', `简化版XML文件已生成到 ${outputFileName}`);
    } catch (error) {
        throw new Error(`生成简化版XML文件失败: ${error.message}`);
    }
}

/**
 * 生成Excel文件
 * @param {Array} cabinets - Cabinet数据数组
 * @param {string} customerName - 客户名称
 * @param {string} outputDir - 输出目录
 * @param {boolean} isPackageChanged - package.json是否发生变化
 */
async function generateExcel(cabinets, customerName, outputDir, isPackageChanged) {
    try {
        // 创建工作簿
        const workbook = new ExcelJS.Workbook();
        
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
        let totalPanels = 0;
        const packagedRows = []; // 存储已打包的行索引
        
        cabinets.forEach((cabinet, cabinetIndex) => {
            // 获取柜体的中文名称
            let chineseCabinetName = cabinet['@_GroupName'] || cabinet['@_Name'] || '未知柜体';
            
            // 检查Panels和Panel是否存在
            let panels = [];
            if (cabinet && cabinet.Panels && cabinet.Panels.Panel) {
                // 确保panels是数组格式
                if (Array.isArray(cabinet.Panels.Panel)) {
                    panels = cabinet.Panels.Panel;
                } else {
                    panels = [cabinet.Panels.Panel];
                }
            }
            
            totalPanels += panels.length;
            
            panels.forEach((item, panelIndex) => {
                // 确保item存在
                if (!item) return;
                
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
                    item['@_Width'] || '',  // 高
                    item['@_Length'] || '', // 宽
                    item['@_Thickness'] || '', // 厚
                    area,
                    item['@_Grain'] || '',
                    item['@_EdgeGroupTypeName'] || '',
                    item['@_HasHorizontalHole'] === 1 ? '是' : (item['@_HasHorizontalHole'] === 0 ? '否' : ''),
                    '', // 槽铣
                    '', // 拉直
                    item['@_DoorDirection'] || '',
                    '', // 门铰孔
                    ''  // 备注
                ]);
                
                // 设置数据行样式 - 居中对齐
                dataRow.alignment = { vertical: 'middle', horizontal: 'center' };
                dataRow.height = 18;
                
                // 如果package.json发生变化且不是空的默认package.json，设置灰色背景
                if (isPackageChanged) {
                    // 记录已打包的行索引
                    packagedRows.push(worksheet.rowCount - 3); // 减去标题行和表头行
                    
                    dataRow.fill = {
                        type: 'pattern',
                        pattern: 'solid',
                        fgColor: { argb: 'FFCCCCCC' } // 灰色背景
                    };
                }
            });
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

        // 生成输出文件名
        const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const outputFileName = path.join(outputDir, config.targetFileName.replace('.xlsx', `_${timestamp}.xlsx`));
        
        // 保存为Excel文件
        await workbook.xlsx.writeFile(outputFileName);
        console.log(`\n✓ Excel表格已生成到 ${outputFileName}`);
        console.log(`✓ 共处理 ${totalPanels} 行数据`);
        logSuccess(customerName, 'EXCEL_GENERATION', `Excel表格已生成到 ${outputFileName}，共处理 ${totalPanels} 行数据`);
        
        // 调用网络同步功能
        await syncToNetwork(outputDir, customerName, packagedRows, totalPanels);
        
        return { success: true, packagedRows, totalRows: totalPanels };
    } catch (error) {
        throw new Error(`生成Excel文件失败: ${error.message}`);
    }
}

/**
 * 检查数据是否发生变化
 * @param {Array} cabinets - Cabinet数据数组
 * @param {string} outputDir - 输出目录
 * @param {string} customerName - 客户名称
 * @returns {Promise<boolean>} - 数据是否发生变化
 */
async function checkDataChanged(cabinets, outputDir, customerName) {
    try {
        // 生成当前数据的哈希值
        const currentDataHash = require('crypto')
            .createHash('md5')
            .update(JSON.stringify(cabinets))
            .digest('hex');

        // 检查是否存在之前的哈希值文件
        const hashFilePath = path.join(outputDir, 'data.hash');
        if (fs.existsSync(hashFilePath)) {
            // 读取之前的哈希值
            const previousHash = fs.readFileSync(hashFilePath, 'utf8');
            
            // 比较哈希值
            if (currentDataHash === previousHash) {
                console.log(`✓ 客户 "${customerName}" 数据未发生变化`);
                logInfo(customerName, 'DATA_CHECK', '数据未发生变化');
                return false;
            }
        }

        // 保存当前哈希值
        fs.writeFileSync(hashFilePath, currentDataHash, 'utf8');
        console.log(`✓ 客户 "${customerName}" 数据已更新`);
        logSuccess(customerName, 'DATA_CHECK', '数据已更新');
        return true;
    } catch (error) {
        const errorMsg = `检查数据变化时发生错误: ${error.message}`;
        console.error(`✗ ${errorMsg}`);
        logError(customerName, 'DATA_CHECK', errorMsg, error.stack);
        // 出错时默认数据已变化
        return true;
    }
}

/**
 * 检查package.json是否发生变化
 * @param {string} outputDir - 输出目录
 * @param {string} customerName - 客户名称
 * @returns {Promise<boolean>} - package.json是否发生变化
 */
async function checkPackageChanged(outputDir, customerName) {
    try {
        // 检查本地package.json文件是否存在，如果不存在则创建
        const localPackagePath = path.join(outputDir, 'package.json');
        if (!fs.existsSync(localPackagePath)) {
            // 创建默认的package.json文件
            const defaultPackage = {
                name: customerName.toLowerCase().replace(/\s+/g, '-'),
                version: "1.0.0",
                description: `Package file for ${customerName}`,
                private: true
            };
            fs.writeFileSync(localPackagePath, JSON.stringify(defaultPackage, null, 2), 'utf8');
            console.log(`✓ 已为客户 "${customerName}" 创建package.json文件`);
            logSuccess(customerName, 'PACKAGE_CHECK', `已创建package.json文件: ${localPackagePath}`);
        }

        // 读取当前package.json的内容
        const packageData = fs.readFileSync(localPackagePath, 'utf8');
        
        // 检查package.json是否为空或只包含默认内容
        const packageJson = JSON.parse(packageData);
        const isEmptyPackage = Object.keys(packageJson).length <= 4 && 
                               packageJson.name && 
                               packageJson.version === "1.0.0" && 
                               packageJson.description && 
                               packageJson.private === true;
        
        if (isEmptyPackage) {
            console.log(`ℹ 客户 "${customerName}" package.json为空或仅包含默认内容`);
            logInfo(customerName, 'PACKAGE_CHECK', 'package.json为空或仅包含默认内容');
            return false;
        }

        const currentPackageHash = require('crypto')
            .createHash('md5')
            .update(packageData)
            .digest('hex');

        // 检查是否存在之前的package.json哈希值文件
        const packageHashFilePath = path.join(outputDir, 'package.hash');
        if (fs.existsSync(packageHashFilePath)) {
            // 读取之前的哈希值
            const previousPackageHash = fs.readFileSync(packageHashFilePath, 'utf8');
            
            // 比较哈希值
            if (currentPackageHash === previousPackageHash) {
                console.log(`✓ 客户 "${customerName}" package.json未发生变化`);
                logInfo(customerName, 'PACKAGE_CHECK', 'package.json未发生变化');
                return false;
            }
        }

        // 保存当前package.json哈希值
        fs.writeFileSync(packageHashFilePath, currentPackageHash, 'utf8');
        console.log(`✓ 客户 "${customerName}" package.json已更新`);
        logSuccess(customerName, 'PACKAGE_CHECK', 'package.json已更新');
        return true;
    } catch (error) {
        const errorMsg = `检查package.json变化时发生错误: ${error.message}`;
        console.error(`✗ ${errorMsg}`);
        logError(customerName, 'PACKAGE_CHECK', errorMsg, error.stack);
        // 出错时默认package.json未变化
        return false;
    }
}

/**
 * 同步Excel文件到网络路径
 * @param {string} outputDir - 本地输出目录
 * @param {string} customerName - 客户名称
 * @param {Array} packagedRows - 已打包的行数据索引
 * @param {number} totalRows - 总行数
 */
async function syncToNetwork(outputDir, customerName, packagedRows, totalRows) {
    // 检查是否启用网络同步
    if (!config.enableNetworkSync) {
        console.log('ℹ 网络同步未启用');
        logInfo(customerName, 'NETWORK_SYNC', '网络同步未启用');
        return;
    }

    try {
        // 检查网络路径是否可访问
        await fs.promises.access(config.networkPath, fs.constants.W_OK);
        
        // 创建目标文件夹名称
        const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        let targetFolderName = `${dateStr}_${customerName}`;
        
        // 检查文件夹是否已存在，如果存在则添加时间戳
        const targetFolderPath = path.join(config.networkPath, targetFolderName);
        if (fs.existsSync(targetFolderPath)) {
            const timestamp = new Date().getTime();
            targetFolderName = `${dateStr}_${customerName}_${timestamp}`;
        }
        
        // 创建目标文件夹
        const finalTargetPath = path.join(config.networkPath, targetFolderName);
        await fs.promises.mkdir(finalTargetPath, { recursive: true });
        
        // 查找localPath中对应客户的Excel文件
        const customerLocalPath = path.join(config.localPath, customerName);
        let sourceExcelFile = null;
        let sourceExcelFileName = null;
        
        if (fs.existsSync(customerLocalPath)) {
            sourceExcelFileName = fs.readdirSync(customerLocalPath).find(file => file.endsWith('.xlsx'));
            if (sourceExcelFileName) {
                sourceExcelFile = path.join(customerLocalPath, sourceExcelFileName);
            }
        }
        
        // 如果在localPath中未找到，则使用outputDir中的文件
        if (!sourceExcelFile) {
            sourceExcelFileName = fs.readdirSync(outputDir).find(file => file.endsWith('.xlsx'));
            if (sourceExcelFileName) {
                sourceExcelFile = path.join(outputDir, sourceExcelFileName);
            }
        }
        
        if (!sourceExcelFile) {
            throw new Error('未找到生成的Excel文件');
        }
        
        // 创建工作簿用于分离已打包和未打包的数据
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.readFile(sourceExcelFile);
        
        // 获取原始工作表
        const originalWorksheet = workbook.getWorksheet('板件明细');
        if (!originalWorksheet) {
            throw new Error('未找到"板件明细"工作表');
        }
        
        // 创建两个新工作表
        const packagedWorksheet = workbook.addWorksheet('已打包数据');
        const remainingWorksheet = workbook.addWorksheet('剩余打包数据');
        
        // 复制列标题和样式
        originalWorksheet.eachRow((row, rowNumber) => {
            if (rowNumber <= 2) { // 标题行和表头行
                const packagedRow = packagedWorksheet.addRow(row.values);
                const remainingRow = remainingWorksheet.addRow(row.values);
                
                // 复制行样式
                copyRowStyle(row, packagedRow);
                copyRowStyle(row, remainingRow);
            } else {
                // 数据行处理
                const rowIndex = rowNumber - 3; // 减去标题行和表头行
                if (packagedRows.includes(rowIndex)) {
                    // 已打包数据
                    const newRow = packagedWorksheet.addRow(row.values);
                    copyRowStyle(row, newRow);
                    
                    // 为已打包数据行添加灰色背景
                    newRow.eachCell((cell) => {
                        cell.fill = {
                            type: 'pattern',
                            pattern: 'solid',
                            fgColor: { argb: 'FFCCCCCC' }
                        };
                    });
                } else {
                    // 剩余数据
                    const newRow = remainingWorksheet.addRow(row.values);
                    copyRowStyle(row, newRow);
                }
            }
        });
        
        // 保存到网络路径（保留原始工作表）
        const targetExcelFile = path.join(finalTargetPath, sourceExcelFileName);
        await workbook.xlsx.writeFile(targetExcelFile);
        
        console.log(`✓ 已同步到网络路径: ${targetExcelFile}`);
        logSuccess(customerName, 'NETWORK_SYNC', `已同步到网络路径: ${targetExcelFile}`);
    } catch (error) {
        console.error(`✗ 网络同步失败: ${error.message}`);
        logError(customerName, 'NETWORK_SYNC', `网络同步失败: ${error.message}`, error.stack);
    }
}

/**
 * 复制行样式
 * @param {ExcelJS.Row} sourceRow - 源行
 * @param {ExcelJS.Row} targetRow - 目标行
 */
function copyRowStyle(sourceRow, targetRow) {
    sourceRow.eachCell((cell, colNumber) => {
        const targetCell = targetRow.getCell(colNumber);
        targetCell.style = { ...cell.style };
        if (cell.font) {
            targetCell.font = { ...cell.font };
        }
        if (cell.fill) {
            targetCell.fill = { ...cell.fill };
        }
        if (cell.alignment) {
            targetCell.alignment = { ...cell.alignment };
        }
        if (cell.border) {
            targetCell.border = { ...cell.border };
        }
    });
    targetRow.height = sourceRow.height;
}

// 如果直接运行此脚本，则执行处理
if (require.main === module) {
    async function main() {
        // 获取sourcePath下的所有客户目录
        const sourcePath = config.sourcePath;
        
        if (!fs.existsSync(sourcePath)) {
            const errorMsg = `源数据目录 "${sourcePath}" 不存在`;
            console.error(`✗ ${errorMsg}`);
            logError('SYSTEM', 'MAIN', errorMsg);
            process.exit(1);
        }
        
        // 读取所有客户目录
        const customers = fs.readdirSync(sourcePath).filter(item => {
            const itemPath = path.join(sourcePath, item);
            return fs.statSync(itemPath).isDirectory();
        });
        
        console.log(`✓ 检测到 ${customers.length} 个客户目录:`, customers);
        logSuccess('SYSTEM', 'MAIN', `检测到 ${customers.length} 个客户目录: ${customers.join(', ')}`);
        
        // 处理每个客户
        let processedCount = 0;
        for (const customer of customers) {
            let customerPath = path.join(sourcePath, customer);
            try {
                customerPath = path.join(customerPath, '设备文件');
                console.log(`\n正在处理客户: ${customer}`);
                logInfo(customer, 'MAIN', `开始处理客户`);
                const success = await autoDetectAndProcessLines(customerPath, customer);
                if (success) {
                    processedCount++;
                    console.log(`✓ 客户 "${customer}" 处理成功`);
                    logSuccess(customer, 'MAIN', `客户处理成功`);
                } else {
                    console.log(`✗ 客户 "${customer}" 处理失败`);
                    logError(customer, 'MAIN', `客户处理失败`);
                }
                
                // 检查package.json是否发生变化
                const isPackageChanged = await checkPackageChanged(outputDir, customer);
                if (isPackageChanged) {
                    console.log(`✓ 客户 "${customer}" package.json已更新`);
                } else {
                    console.log(`✓ 客户 "${customer}" package.json未发生变化`);
                }
                
                // 生成Excel文件
                const result = await generateExcel(cabinets, customer, outputDir, isPackageChanged);
                
                if (result.success) {
                    console.log('✓ Excel文件生成成功');
                    logSuccess(customer, 'MAIN', 'Excel文件生成成功');
                }
                
                console.log(`✓ 客户 "${customer}" 处理成功`);
                logSuccess(customer, 'MAIN', '客户处理成功');
            } catch (error) {
                const errorMsg = `处理客户 "${customer}" 时发生错误: ${error.message}`;
                console.error(`✗ ${errorMsg}`);
                console.error(error.stack);
                logError(customer, 'MAIN', errorMsg, error.stack);
            }
        }
        
        console.log(`\n✓ 处理完成，共处理了 ${processedCount} 个客户`);
        logSuccess('SYSTEM', 'MAIN', `处理完成，共处理了 ${processedCount} 个客户`);
    }
    
    main();
}

/**
 * 同步Excel文件到网络路径
 * @param {string} outputDir - 本地输出目录
 * @param {string} customerName - 客户名称
 * @param {Array} packagedRows - 已打包的行数据索引
 * @param {number} totalRows - 总行数
 */
async function syncToNetwork(outputDir, customerName, packagedRows, totalRows) {
    // 检查是否启用网络同步
    if (!config.enableNetworkSync) {
        console.log('ℹ 网络同步未启用');
        logInfo(customerName, 'NETWORK_SYNC', '网络同步未启用');
        return;
    }

    try {
        // 检查网络路径是否可访问
        await fs.promises.access(config.networkPath, fs.constants.W_OK);
        
        // 创建目标文件夹名称
        const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        let targetFolderName = `${dateStr}_${customerName}`;
        
        // 检查文件夹是否已存在，如果存在则添加时间戳
        const targetFolderPath = path.join(config.networkPath, targetFolderName);
        if (fs.existsSync(targetFolderPath)) {
            const timestamp = new Date().getTime();
            targetFolderName = `${dateStr}_${customerName}_${timestamp}`;
        }
        
        // 创建目标文件夹
        const finalTargetPath = path.join(config.networkPath, targetFolderName);
        await fs.promises.mkdir(finalTargetPath, { recursive: true });
        
        // 读取原始Excel文件
        const sourceExcelFileName = fs.readdirSync(outputDir).find(file => file.endsWith('.xlsx'));
        if (!sourceExcelFileName) {
            throw new Error('未找到生成的Excel文件');
        }
        
        const sourceExcelFile = path.join(outputDir, sourceExcelFileName);
        
        // 创建工作簿用于分离已打包和未打包的数据
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.readFile(sourceExcelFile);
        
        // 获取原始工作表
        const originalWorksheet = workbook.getWorksheet('板件明细');
        if (!originalWorksheet) {
            throw new Error('未找到"板件明细"工作表');
        }
        
        // 创建两个新工作表
        const packagedWorksheet = workbook.addWorksheet('已打包数据');
        const remainingWorksheet = workbook.addWorksheet('剩余打包数据');
        
        // 复制列标题和样式
        originalWorksheet.eachRow((row, rowNumber) => {
            if (rowNumber <= 2) { // 标题行和表头行
                const packagedRow = packagedWorksheet.addRow(row.values);
                const remainingRow = remainingWorksheet.addRow(row.values);
                
                // 复制行样式
                copyRowStyle(row, packagedRow);
                copyRowStyle(row, remainingRow);
            } else {
                // 数据行处理
                const rowIndex = rowNumber - 3; // 减去标题行和表头行
                if (packagedRows.includes(rowIndex)) {
                    // 已打包数据
                    const newRow = packagedWorksheet.addRow(row.values);
                    copyRowStyle(row, newRow);
                } else {
                    // 剩余数据
                    const newRow = remainingWorksheet.addRow(row.values);
                    copyRowStyle(row, newRow);
                }
            }
        });
        
        // 删除原始工作表
        workbook.removeWorksheet('板件明细');
        
        // 保存到网络路径
        const targetExcelFile = path.join(finalTargetPath, sourceExcelFileName);
        await workbook.xlsx.writeFile(targetExcelFile);
        
        console.log(`✓ 已同步到网络路径: ${targetExcelFile}`);
        logSuccess(customerName, 'NETWORK_SYNC', `已同步到网络路径: ${targetExcelFile}`);
    } catch (error) {
        console.error(`✗ 网络同步失败: ${error.message}`);
        logError(customerName, 'NETWORK_SYNC', `网络同步失败: ${error.message}`, error.stack);
    }
}

/**
 * 复制行样式
 * @param {ExcelJS.Row} sourceRow - 源行
 * @param {ExcelJS.Row} targetRow - 目标行
 */
function copyRowStyle(sourceRow, targetRow) {
    sourceRow.eachCell((cell, colNumber) => {
        const targetCell = targetRow.getCell(colNumber);
        targetCell.style = { ...cell.style };
        if (cell.font) {
            targetCell.font = { ...cell.font };
        }
        if (cell.fill) {
            targetCell.fill = { ...cell.fill };
        }
        if (cell.alignment) {
            targetCell.alignment = { ...cell.alignment };
        }
        if (cell.border) {
            targetCell.border = { ...cell.border };
        }
    });
    targetRow.height = sourceRow.height;
}

module.exports = { autoDetectAndProcessLines };