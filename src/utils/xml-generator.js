const fs = require('fs');
const path = require('path');
const { logSuccess, logWarning, logError } = require('./logger');

// 读取配置文件
const configPath = path.join(__dirname, '..', '..', 'config.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

// 清理XML名称，确保只包含合法字符
function sanitizeXmlName(name) {
  // 处理非字符串类型
  if (name === null || name === undefined) return 'item';
  if (typeof name !== 'string') {
    // 转换为字符串并清理
    name = String(name);
  }

  // 移除所有非法XML名称字符
  // XML 1.0 规范: 名称必须以字母、下划线或冒号开头
  // 后续字符可以是字母、数字、下划线、冒号、连字符或点

  // 第一步：移除所有控制字符和不可打印字符
  let sanitized = name.replace(/[\x00-\x1F\x7F]/g, '');

  // 第二步：保留XML允许的基本字符（字母、数字、下划线、冒号、连字符、点）
  // 注意：尽管XML规范允许冒号，但实际使用中应避免使用（保留给命名空间）
  sanitized = sanitized.replace(/[^\w:\-\.]/g, '');

  // 第三步：确保名称不为空
  if (!sanitized || sanitized.length === 0) {
    sanitized = 'item';
  }

  // 第四步：确保名称符合XML命名规则
  // 必须以字母、下划线或冒号开头
  if (!/^[a-zA-Z_:]/.test(sanitized)) {
    // 添加前缀以符合要求
    if (/^[0-9\-\.]/.test(sanitized)) {
      sanitized = 'x' + sanitized;
    } else {
      sanitized = 'item' + sanitized;
    }
  }

  // 第五步：限制长度（可选，XML没有严格的长度限制，但实际应用中可能需要）
  if (sanitized.length > 100) {
    sanitized = sanitized.substring(0, 100);
  }

  // 第六步：确保不包含XML关键字
  const xmlKeywords = ['xml', 'Xml', 'XML'];
  if (xmlKeywords.includes(sanitized)) {
    sanitized = 'x' + sanitized;
  }

  return sanitized;
}

/**
 * 保存解析后的XML数据到文件
 * @param {Object} data - 解析后的XML数据
 * @param {string} outputPath - 输出文件路径
 * @param {string} customerName - 客户名称
 */
function saveParsedXmlData(data, outputPath, customerName) {
  try {
    // 确保输出目录存在
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
      console.log(`✓ 创建输出目录: ${outputDir}`);
      logSuccess(
        customerName,
        'DIRECTORY_CREATED',
        `创建输出目录: ${outputDir}`
      );
    }

    // 将数据保存为JSON格式（便于调试和后续处理）
    fs.writeFileSync(outputPath, JSON.stringify(data, null, 2), 'utf8');
    console.log(`✓ 解析后的XML数据已保存到: ${outputPath}`);
    logSuccess(customerName, 'DATA_SAVE', `解析后的XML数据已保存到: ${outputPath}`);
  } catch (error) {
    console.error(`✗ 保存解析后的XML数据失败: ${error.message}`);
    logError(customerName, 'DATA_SAVE', `保存解析后的XML数据失败: ${error.message}`, error.stack);
  }
}

/**
 * 生成符合temp-pack目录中XML格式的XML文件
 * @param {Array} panels - Panel数据数组
 * @param {string} tempXmlPath - XML文件路径
 * @param {string} customerName - 客户名称
 * @param {string} lineDir - 产线目录名
 * @param {Array} originalCabinets - 可选，原始的Cabinet数据数组，用于在Panel缺少Cabinet属性时恢复信息
 */
function generateTempXml(panels, tempXmlPath, customerName, lineDir, originalCabinets = []) {
  try {
    console.log(`DEBUG: 传入的tempXmlPath: ${tempXmlPath}`);
    console.log(`DEBUG: 客户名称: ${customerName}`);

    // 确保输出目录存在
    const outputDir = path.dirname(tempXmlPath);
    console.log(`DEBUG: 输出目录: ${outputDir}`);

    // 处理长路径问题（Windows系统）
    const normalizedPath = process.platform === 'win32' && outputDir.startsWith('\\\\')
      ? outputDir
      : outputDir.replace(/\\/g, '/');

    // 检查路径长度限制（Windows系统）
    if (process.platform === 'win32' && normalizedPath.length > 240) {
      throw new Error(`文件路径过长: ${normalizedPath}（最大长度: 240字符）`);
    }

    if (!fs.existsSync(normalizedPath)) {
      fs.mkdirSync(normalizedPath, { recursive: true });
      console.log(`✓ 创建输出目录: ${normalizedPath}`);
      logSuccess(
        customerName,
        'DIRECTORY_CREATED',
        `创建输出目录: ${normalizedPath}`
      );
    }

    // 替换文件名中的占位符（总是替换，不管是否包含占位符）
    let finalXmlPath = tempXmlPath;
    const fileName = path.basename(tempXmlPath);
    console.log(`DEBUG: 文件名: ${fileName}`);
    // 总是替换占位符
    const newFileName = fileName.replace(/{customerName}/g, customerName);
    console.log(`DEBUG: 替换后的文件名: ${newFileName}`);
    // 构建新的文件路径
    finalXmlPath = path.join(outputDir, newFileName);
    console.log(`DEBUG: 最终文件路径: ${finalXmlPath}`);

    // 使用配置中的XML结构模板
    const xmlTemplate = JSON.parse(JSON.stringify(config.xmlStructureTemplate));

    // 替换模板中的占位符
    const currentDate = new Date();
    const orderNo = 'F' + currentDate.toISOString().slice(2, 10).replace(/-/g, '');
    const shopOrderCode = 'S' + currentDate.toISOString().slice(2, 10).replace(/-/g, '') + '0001';
    const currentDateTime = currentDate.toISOString().slice(0, 19).replace('T', ' ');
    const deliveryDate = new Date(currentDate.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const batchNo = 'PC' + currentDate.toISOString().slice(2, 10).replace(/-/g, '') + '0001';

    // 默认值
    const defaultValues = {
      customerAddress: customerName + '地址',
      customerPhone: '13800000000',
      groupName: customerName + '柜组',
      roomName: customerName + '房间',
      shopName: customerName + '门店'
    };

    // 创建Cabinet结构函数（与老版本VBA程序输出一致）
    // 添加originalCabinets参数，用于在Panel缺少Cabinet属性时从原始数据恢复信息
    function createCabinetsFromPanels(panels, customerName, currentDateTime, orderNo, shopOrderCode, defaultValues, deliveryDate, batchNo, originalCabinets = []) {
      const cabinets = [];
      const cabinetMap = new Map();

      // 检查是否所有panel都没有Cabinet属性
      const allPanelsHaveNoCabinet = panels.every(panel => !panel.Cabinet);

      // 如果提供了原始Cabinet数据且所有panel都没有Cabinet属性，使用原始数据创建Cabinet
      if (originalCabinets.length > 0 && allPanelsHaveNoCabinet) {
        // 为每个原始Cabinet创建对应的结构
        originalCabinets.forEach((originalCabinet, index) => {
          // 使用原始Cabinet的Name或生成一个唯一名称
          const cabinetName = originalCabinet.Name || `_${index + 1}`;

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

          // 添加更多Cabinet属性以匹配目标XML格式
          cabinet[sanitizeXmlName('AlongSys')] = '';
          cabinet[sanitizeXmlName('Area')] = '';
          cabinet[sanitizeXmlName('BasicMaterial')] = '福人精板';
          cabinet[sanitizeXmlName('BatchNoRemark')] = customerName + '-正单';
          cabinet[sanitizeXmlName('CabinetNo')] = '1;2';
          cabinet[sanitizeXmlName('CabinetType')] = 'group';
          cabinet[sanitizeXmlName('City')] = '重庆市';
          cabinet[sanitizeXmlName('ClassType')] = 'wardrobe';
          cabinet[sanitizeXmlName('Comment')] = '';
          cabinet[sanitizeXmlName('CustomId')] = '';
          cabinet[sanitizeXmlName('DealerName')] = '';
          cabinet[sanitizeXmlName('Designer')] = customerName + '-审单';
          cabinet[sanitizeXmlName('DisOrderNickName')] = customerName + '-审单';
          cabinet[sanitizeXmlName('DiyOrderNo')] = '';
          cabinet[sanitizeXmlName('Height')] = '2840.00';
          cabinet[sanitizeXmlName('HouseType')] = '';
          cabinet[sanitizeXmlName('Id')] = '';
          cabinet[sanitizeXmlName('IsUrgent')] = '0';
          cabinet[sanitizeXmlName('ItemNo')] = '';
          cabinet[sanitizeXmlName('Length')] = '2652.00';
          cabinet[sanitizeXmlName('Material')] = 'L8082';
          cabinet[sanitizeXmlName('Model')] = '';
          cabinet[sanitizeXmlName('OrderCount')] = '1';
          cabinet[sanitizeXmlName('OrderName')] = '衣柜-全屋';
          cabinet[sanitizeXmlName('OrderSortingNo')] = '0';
          cabinet[sanitizeXmlName('OrderType')] = '衣柜';
          cabinet[sanitizeXmlName('OriginalUid')] = '';
          cabinet[sanitizeXmlName('OutsideOrderNo')] = '';
          cabinet[sanitizeXmlName('PartNumber')] = 'group-001';
          cabinet[sanitizeXmlName('Province')] = '重庆';
          cabinet[sanitizeXmlName('RoomId')] = '33';
          cabinet[sanitizeXmlName('SchemeId')] = '';
          cabinet[sanitizeXmlName('Series')] = '';
          cabinet[sanitizeXmlName('SignUserNickName')] = '';
          cabinet[sanitizeXmlName('SubType')] = '';
          cabinet[sanitizeXmlName('TaskID')] = '';
          cabinet[sanitizeXmlName('TaskNO')] = '';
          cabinet[sanitizeXmlName('ThickEdgeValue')] = '1.00';
          cabinet[sanitizeXmlName('ThinEdgeValue')] = '1.00';
          cabinet[sanitizeXmlName('Uid')] = '';
          cabinet[sanitizeXmlName('Uid2')] = '';
          cabinet[sanitizeXmlName('Width')] = '1785.00';
          cabinet[sanitizeXmlName('bomUserRealName')] = customerName + '-审单';
          cabinet[sanitizeXmlName('cityName')] = '重庆市';
          cabinet[sanitizeXmlName('contractNo')] = '';
          cabinet[sanitizeXmlName('dealerCode')] = '';
          cabinet[sanitizeXmlName('designerMobile')] = '19112393606';
          cabinet[sanitizeXmlName('designerName')] = customerName + '-审单';
          cabinet[sanitizeXmlName('designerUserRealName')] = customerName + '-审单';
          cabinet[sanitizeXmlName('districtName')] = '';
          cabinet[sanitizeXmlName('orderTypeDictKey')] = 'custom-order';
          cabinet[sanitizeXmlName('orderTypeDictVal')] = '定制单';
          cabinet[sanitizeXmlName('placeTypeD')] = '零售单';
          cabinet[sanitizeXmlName('planDeliveryDate')] = '';
          cabinet[sanitizeXmlName('provinceName')] = '重庆';
          cabinet[sanitizeXmlName('remark')] = '';
          cabinet[sanitizeXmlName('shopCode')] = '';
          cabinet[sanitizeXmlName('shopOrderName')] = customerName;
          cabinet[sanitizeXmlName('shopOrderSubmitTime')] = currentDateTime.replace(' ', 'T');
          cabinet[sanitizeXmlName('submitName')] = customerName + '-审单';
          cabinet[sanitizeXmlName('Panels')] = {
            [sanitizeXmlName('Panel')]: []
          };
          cabinet[sanitizeXmlName('ExtendBomLists')] = {
            [sanitizeXmlName('ExtendBomList')]: {}
          };

          cabinetMap.set(cabinetName, cabinet);
        });

        // 平均分配panel到各个cabinet
        const panelsPerCabinet = Math.ceil(panels.length / originalCabinets.length);
        let currentCabinetIndex = 0;
        let panelCountInCurrentCabinet = 0;
        const cabinetNames = Array.from(cabinetMap.keys());

        panels.forEach(panel => {
          // 如果当前cabinet已经达到分配数量，移到下一个cabinet
          if (panelCountInCurrentCabinet >= panelsPerCabinet) {
            currentCabinetIndex = (currentCabinetIndex + 1) % cabinetNames.length;
            panelCountInCurrentCabinet = 0;
          }

          const cabinetName = cabinetNames[currentCabinetIndex];

          // 移除Panel对象中的Cabinet属性，避免重复，并确保属性格式与老版本一致
          const panelCopy = JSON.parse(JSON.stringify(panel));
          delete panelCopy.Cabinet;

          // 确保Panel元素使用属性格式而不是子元素格式（与老版本VBA程序完全一致）
          const panelWithAttributes = {};
          for (const key in panelCopy) {
            // 对于Panel下的属性，我们需要正确处理@_前缀
            // 如果键名以@_开头，我们去掉@_前缀，而不是使用sanitizeXmlName
            let finalKey;
            if (key.startsWith('@_')) {
              // 去掉@_前缀，保留剩下的部分
              finalKey = key.substring(2);
            } else {
              // 对于其他键名，使用原有的清理逻辑
              finalKey = sanitizeXmlName(key);
            }

            if (typeof panelCopy[key] === 'object' && panelCopy[key] !== null && !Array.isArray(panelCopy[key])) {
              // 处理嵌套对象（如LabelInfo、EdgeGroup、Machines等）
              // 将这些嵌套对象转换为属性格式
              if (key === 'LabelInfo' || key === 'EdgeGroup' || key === 'Machines' || key === 'Handles' || key === 'ProduceValues') {
                const nestedObj = panelCopy[key];
                for (const nestedKey in nestedObj) {
                  if (nestedObj[nestedKey] !== null && nestedObj[nestedKey] !== undefined) {
                    // 同样处理嵌套对象中的@_前缀
                    let finalNestedKey;
                    if (nestedKey.startsWith('@_')) {
                      finalNestedKey = nestedKey.substring(2);
                    } else {
                      finalNestedKey = sanitizeXmlName(nestedKey);
                    }
                    panelWithAttributes[finalNestedKey] = nestedObj[nestedKey];
                  }
                }
              } else {
                panelWithAttributes[finalKey] = panelCopy[key];
              }
            } else {
              // 简单属性直接作为XML属性
              panelWithAttributes[finalKey] = panelCopy[key];
            }
          }

          cabinetMap.get(cabinetName)['Panels']['Panel'].push(panelWithAttributes);
          panelCountInCurrentCabinet++;
        });
      } else {
        // 原始逻辑 - 按Cabinet分组panels
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

            // 添加更多Cabinet属性以匹配目标XML格式
            cabinet[sanitizeXmlName('AlongSys')] = '';
            cabinet[sanitizeXmlName('Area')] = '';
            cabinet[sanitizeXmlName('BasicMaterial')] = '福人精板';
            cabinet[sanitizeXmlName('BatchNoRemark')] = customerName + '-正单';
            cabinet[sanitizeXmlName('CabinetNo')] = '1;2';
            cabinet[sanitizeXmlName('CabinetType')] = 'group';
            cabinet[sanitizeXmlName('City')] = '重庆市';
            cabinet[sanitizeXmlName('ClassType')] = 'wardrobe';
            cabinet[sanitizeXmlName('Comment')] = '';
            cabinet[sanitizeXmlName('CustomId')] = '';
            cabinet[sanitizeXmlName('DealerName')] = '';
            cabinet[sanitizeXmlName('Designer')] = customerName + '-审单';
            cabinet[sanitizeXmlName('DisOrderNickName')] = customerName + '-审单';
            cabinet[sanitizeXmlName('DiyOrderNo')] = '';
            cabinet[sanitizeXmlName('Height')] = '2840.00';
            cabinet[sanitizeXmlName('HouseType')] = '';
            cabinet[sanitizeXmlName('Id')] = '';
            cabinet[sanitizeXmlName('IsUrgent')] = '0';
            cabinet[sanitizeXmlName('ItemNo')] = '';
            cabinet[sanitizeXmlName('Length')] = '2652.00';
            cabinet[sanitizeXmlName('Material')] = 'L8082';
            cabinet[sanitizeXmlName('Model')] = '';
            cabinet[sanitizeXmlName('OrderCount')] = '1';
            cabinet[sanitizeXmlName('OrderName')] = '衣柜-全屋';
            cabinet[sanitizeXmlName('OrderSortingNo')] = '0';
            cabinet[sanitizeXmlName('OrderType')] = '衣柜';
            cabinet[sanitizeXmlName('OriginalUid')] = '';
            cabinet[sanitizeXmlName('OutsideOrderNo')] = '';
            cabinet[sanitizeXmlName('PartNumber')] = 'group-001';
            cabinet[sanitizeXmlName('Province')] = '重庆';
            cabinet[sanitizeXmlName('RoomId')] = '33';
            cabinet[sanitizeXmlName('SchemeId')] = '';
            cabinet[sanitizeXmlName('Series')] = '';
            cabinet[sanitizeXmlName('SignUserNickName')] = '';
            cabinet[sanitizeXmlName('SubType')] = '';
            cabinet[sanitizeXmlName('TaskID')] = '';
            cabinet[sanitizeXmlName('TaskNO')] = '';
            cabinet[sanitizeXmlName('ThickEdgeValue')] = '1.00';
            cabinet[sanitizeXmlName('ThinEdgeValue')] = '1.00';
            cabinet[sanitizeXmlName('Uid')] = '';
            cabinet[sanitizeXmlName('Uid2')] = '';
            cabinet[sanitizeXmlName('Width')] = '1785.00';
            cabinet[sanitizeXmlName('bomUserRealName')] = customerName + '-审单';
            cabinet[sanitizeXmlName('cityName')] = '重庆市';
            cabinet[sanitizeXmlName('contractNo')] = '';
            cabinet[sanitizeXmlName('dealerCode')] = '';
            cabinet[sanitizeXmlName('designerMobile')] = '19112393606';
            cabinet[sanitizeXmlName('designerName')] = customerName + '-审单';
            cabinet[sanitizeXmlName('designerUserRealName')] = customerName + '-审单';
            cabinet[sanitizeXmlName('districtName')] = '';
            cabinet[sanitizeXmlName('orderTypeDictKey')] = 'custom-order';
            cabinet[sanitizeXmlName('orderTypeDictVal')] = '定制单';
            cabinet[sanitizeXmlName('placeTypeD')] = '零售单';
            cabinet[sanitizeXmlName('planDeliveryDate')] = '';
            cabinet[sanitizeXmlName('provinceName')] = '重庆';
            cabinet[sanitizeXmlName('remark')] = '';
            cabinet[sanitizeXmlName('shopCode')] = '';
            cabinet[sanitizeXmlName('shopOrderName')] = customerName;
            cabinet[sanitizeXmlName('shopOrderSubmitTime')] = currentDateTime.replace(' ', 'T');
            cabinet[sanitizeXmlName('submitName')] = customerName + '-审单';
            cabinet[sanitizeXmlName('Panels')] = {
              [sanitizeXmlName('Panel')]: []
            };
            cabinet[sanitizeXmlName('ExtendBomLists')] = {
              [sanitizeXmlName('ExtendBomList')]: {}
            };

            cabinetMap.set(cabinetName, cabinet);
          }
          // 移除Panel对象中的Cabinet属性，避免重复，并确保属性格式与老版本一致
          const panelCopy = JSON.parse(JSON.stringify(panel));
          delete panelCopy.Cabinet;

          // 确保Panel元素使用属性格式而不是子元素格式（与老版本VBA程序完全一致）
          const panelWithAttributes = {};
          for (const key in panelCopy) {
            // 对于Panel下的属性，我们需要正确处理@_前缀
            // 如果键名以@_开头，我们去掉@_前缀，而不是使用sanitizeXmlName
            let finalKey;
            if (key.startsWith('@_')) {
              // 去掉@_前缀，保留剩下的部分
              finalKey = key.substring(2);
            } else {
              // 对于其他键名，使用原有的清理逻辑
              finalKey = sanitizeXmlName(key);
            }

            if (typeof panelCopy[key] === 'object' && panelCopy[key] !== null && !Array.isArray(panelCopy[key])) {
              // 处理嵌套对象（如LabelInfo、EdgeGroup、Machines等）
              // 将这些嵌套对象转换为属性格式
              if (key === 'LabelInfo' || key === 'EdgeGroup' || key === 'Machines' || key === 'Handles' || key === 'ProduceValues') {
                const nestedObj = panelCopy[key];
                for (const nestedKey in nestedObj) {
                  if (nestedObj[nestedKey] !== null && nestedObj[nestedKey] !== undefined) {
                    // 同样处理嵌套对象中的@_前缀
                    let finalNestedKey;
                    if (nestedKey.startsWith('@_')) {
                      finalNestedKey = nestedKey.substring(2);
                    } else {
                      finalNestedKey = sanitizeXmlName(nestedKey);
                    }
                    panelWithAttributes[finalNestedKey] = nestedObj[nestedKey];
                  }
                }
              } else {
                panelWithAttributes[finalKey] = panelCopy[key];
              }
            } else {
              // 简单属性直接作为XML属性
              panelWithAttributes[finalKey] = panelCopy[key];
            }
          }
          cabinetMap.get(cabinetName)['Panels']['Panel'].push(panelWithAttributes);
        });
      }

      // 转换为数组
      cabinetMap.forEach(cabinet => {
        cabinets.push(cabinet);
      });

      return cabinets;
    }

    // 递归替换模板中的占位符
    function replacePlaceholders(obj) {
      for (let key in obj) {
        // 对标签名进行清理
        const sanitizedKey = sanitizeXmlName(key);

        if (typeof obj[key] === 'string') {
          const value = obj[key]
            .replace(/{customerName}/g, customerName)
            .replace(/{currentDateTime}/g, currentDateTime)
            .replace(/{orderNo}/g, orderNo)
            .replace(/{shopOrderCode}/g, shopOrderCode)
            .replace(/{customerAddress}/g, defaultValues.customerAddress)
            .replace(/{customerPhone}/g, defaultValues.customerPhone)
            .replace(/{groupName}/g, defaultValues.groupName)
            .replace(/{roomName}/g, defaultValues.roomName)
            .replace(/{shopName}/g, defaultValues.shopName)
            .replace(/{deliveryDate}/g, deliveryDate)
            .replace(/{batchNo}/g, batchNo);

          if (sanitizedKey !== key) {
            obj[sanitizedKey] = value;
            delete obj[key];
          } else {
            obj[key] = value;
          }
        } else if (typeof obj[key] === 'object' && obj[key] !== null) {
          // 先递归处理子对象
          replacePlaceholders(obj[key]);

          // 检查是否是Panel节点的占位符
          if (key === 'Panel' && typeof obj[key] === 'string' && obj[key] === '{panels}') {
            // 这是Panel节点的占位符，替换为实际的panels数据
            obj[key] = panels;
          } else if (key === 'cabinets' && typeof obj[key] === 'string' && obj[key] === '{cabinets}') {
            // 这是cabinets节点的占位符，需要根据panels数据创建多个Cabinet结构
            const cabinetsArray = createCabinetsFromPanels(panels, customerName, currentDateTime, orderNo, shopOrderCode, defaultValues, deliveryDate, batchNo, originalCabinets);
            obj[key] = cabinetsArray;
          } else if (key === 'cabinets' && Array.isArray(obj[key])) {
            // 处理cabinets数组模板
            const cabinetsArray = createCabinetsFromPanels(panels, customerName, currentDateTime, orderNo, shopOrderCode, defaultValues, deliveryDate, batchNo, originalCabinets);
            obj[key] = cabinetsArray;
          }

          // 如果键名已被清理且与原键名不同，更新键名
          if (sanitizedKey !== key) {
            obj[sanitizedKey] = obj[key];
            delete obj[key];
          }
        }
      }
    }

    // 使用手动构建XML的方式，避免使用复杂的XML库
    // 这将确保我们能够正确生成包含多个Cabinet标签的XML文件
    function buildXmlManually(cabinets) {
      let xml = '<?xml version="1.0" encoding="utf-8"?>' + '\n';
      xml += '<Root>' + '\n';

      // 为每个cabinet生成一个<cabinets>标签
      cabinets.forEach(cabinet => {
        xml += '\t<cabinets>' + '\n';

        // 添加cabinet的所有属性
        for (const key in cabinet) {
          const sanitizedKey = sanitizeXmlName(key);
          const value = cabinet[key];

          if (value === null || value === undefined || value === '') {
            continue;
          }

          if (typeof value === 'object' && !Array.isArray(value)) {
            // 处理嵌套对象
            xml += '\t\t<' + sanitizedKey + '>' + '\n';
            for (const nestedKey in value) {
              const sanitizedNestedKey = sanitizeXmlName(nestedKey);
              const nestedValue = value[nestedKey];

              if (nestedValue === null || nestedValue === undefined || nestedValue === '') {
                continue;
              }

              if (typeof nestedValue === 'object') {
                // 处理更深层次的嵌套
                if (Array.isArray(nestedValue)) {
                  // 处理数组（如Panels.Panel）
                  nestedValue.forEach(item => {
                    xml += '\t\t\t<' + sanitizedNestedKey + '>' + '\n';
                    for (const itemKey in item) {
                      // Panel下的子元素已经去掉了@_前缀，直接使用原键名
                      const itemValue = item[itemKey];
                      if (itemValue !== null && itemValue !== undefined && itemValue !== '') {
                        xml += '\t\t\t\t<' + itemKey + '>' + escapeXml(itemValue) + '</' + itemKey + '>' + '\n';
                      }
                    }
                    xml += '\t\t\t</' + sanitizedNestedKey + '>' + '\n';
                  });
                } else {
                  // 处理非数组对象
                  for (const deepKey in nestedValue) {
                    const sanitizedDeepKey = sanitizeXmlName(deepKey);
                    const deepValue = nestedValue[deepKey];
                    if (deepValue !== null && deepValue !== undefined && deepValue !== '') {
                      xml += '\t\t\t<' + sanitizedDeepKey + '>' + escapeXml(deepValue) + '</' + sanitizedDeepKey + '>' + '\n';
                    }
                  }
                }
              } else {
                // 简单值
                xml += '\t\t\t<' + sanitizedNestedKey + '>' + escapeXml(nestedValue) + '</' + sanitizedNestedKey + '>' + '\n';
              }
            }
            xml += '\t\t</' + sanitizedKey + '>' + '\n';
          } else if (Array.isArray(value)) {
            // 处理直接的数组
            value.forEach(item => {
              xml += '\t\t<' + sanitizedKey + '>' + escapeXml(String(item)) + '</' + sanitizedKey + '>' + '\n';
            });
          } else {
            // 简单属性
            xml += '\t\t<' + sanitizedKey + '>' + escapeXml(String(value)) + '</' + sanitizedKey + '>' + '\n';
          }
        }

        xml += '\t</cabinets>' + '\n';
      });

      xml += '</Root>';
      return xml;
    }

    // 转义XML特殊字符
    function escapeXml(text) {
      if (typeof text !== 'string') {
        text = String(text);
      }
      return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
    }

    // 创建cabinet数组
    const cabinetsArray = createCabinetsFromPanels(panels, customerName, currentDateTime, orderNo, shopOrderCode, defaultValues, deliveryDate, batchNo, originalCabinets);

    // 构建XML
    let simplifiedXml = buildXmlManually(cabinetsArray);

    // 保存为XML文件
    if (simplifiedXml) {
      console.log(`DEBUG: 准备写入文件: ${finalXmlPath}`);
      fs.writeFileSync(finalXmlPath, simplifiedXml, 'utf8');
      // 验证文件是否写入成功
      if (fs.existsSync(finalXmlPath)) {
        console.log(`DEBUG: 文件写入成功: ${finalXmlPath}`);
        const stats = fs.statSync(finalXmlPath);
        console.log(`DEBUG: 文件大小: ${stats.size} 字节`);
      } else {
        console.log(`DEBUG: 文件写入失败: ${finalXmlPath}`);
      }
      console.log(`✓ 简化版XML文件已生成到 ${finalXmlPath}`);
      logSuccess(
        customerName,
        'XML_GENERATION',
        `简化版XML文件已生成到 ${finalXmlPath}`
      );
      return finalXmlPath;  // 返回生成的文件路径
    } else {
      console.warn('⚠ 无法生成简化版XML文件');
      logWarning(
        customerName,
        'XML_GENERATION',
        '无法生成简化版XML文件'
      );
      return null;  // 返回null表示生成失败
    }
  } catch (error) {
    console.error('✗ 生成简化版XML文件时出错:', error.message);
    logError(
      customerName,
      'XML_GENERATION',
      `生成简化版XML文件时出错: ${error.message}`,
      error.stack
    );
    throw error;
  }
}

module.exports = {
  generateTempXml,
  saveParsedXmlData
};