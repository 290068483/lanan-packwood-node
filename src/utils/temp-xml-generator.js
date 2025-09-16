const fs = require('fs');
const path = require('path');
const { logSuccess, logWarning, logError } = require('./logger');

// 读取配置文件
const configPath = path.join(__dirname, '..', '..', 'config.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

/**
 * 生成符合temp-pack目录中XML格式的temp.xml文件
 * @param {Array} cabinets - Cabinet数据数组，每个Cabinet包含Panels
 * @param {string} tempXmlPath - temp.xml文件路径
 * @param {string} customerName - 客户名称
 * @param {string} lineDir - 产线目录名
 */
function generateTempXml(cabinets, tempXmlPath, customerName, lineDir) {
  try {
    // 确保输出目录存在
    const outputDir = path.dirname(tempXmlPath);
    
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
    
    // 使用配置中的XML结构模板
    const xmlTemplate = {
      '?xml': {
        '@_version': '1.0',
        '@_encoding': 'utf-8'
      },
      Root: {
        Cabinet: [] // 初始化为空数组
      }
    };
    
    // 为每个Cabinet生成数据
    cabinets.forEach((cabinet, index) => {
      const currentDate = new Date();
      const orderNo = 'F' + currentDate.toISOString().slice(2, 10).replace(/-/g, '');
      const shopOrderCode = 'S' + currentDate.toISOString().slice(2, 10).replace(/-/g, '') + '0001';
      const currentDateTime = currentDate.toISOString().slice(0, 19).replace('T', ' ');
      
      // 创建Cabinet节点
      const cabinetNode = {
        "@_Address": cabinet['@_Address'] || "",
        "@_AlongSys": cabinet['@_AlongSys'] || "",
        "@_BasicMaterial": cabinet['@_BasicMaterial'] || "亿维雅",
        "@_BatchNo": cabinet['@_BatchNo'] || "PC018341992508290004",
        "@_BatchNoRemark": cabinet['@_BatchNoRemark'] || customerName,
        "@_CabinetNo": cabinet['@_CabinetNo'] || (index + 1).toString(),
        "@_CabinetType": cabinet['@_CabinetType'] || "group",
        "@_ClassType": cabinet['@_ClassType'] || "wardrobe",
        "@_Comment": cabinet['@_Comment'] || "",
        "@_ContactAddress": cabinet['@_ContactAddress'] || "",
        "@_ContactRealName": cabinet['@_ContactRealName'] || customerName,
        "@_ContactWay": cabinet['@_ContactWay'] || "",
        "@_CraftMark": cabinet['@_CraftMark'] || "",
        "@_CustomAddress": cabinet['@_CustomAddress'] || "",
        "@_CustomId": cabinet['@_CustomId'] || "",
        "@_Customer": cabinet['@_Customer'] || customerName,
        "@_DealerName": cabinet['@_DealerName'] || "",
        "@_DeliveryDate": cabinet['@_DeliveryDate'] || "",
        "@_Designer": cabinet['@_Designer'] || "",
        "@_DisOrderNickName": cabinet['@_DisOrderNickName'] || "",
        "@_DiyOrderNo": cabinet['@_DiyOrderNo'] || "",
        "@_GroupName": cabinet['@_GroupName'] || customerName,
        "@_Height": cabinet['@_Height'] || "0.00",
        "@_HouseType": cabinet['@_HouseType'] || "",
        "@_Id": cabinet['@_Id'] || "",
        "@_IsUrgent": cabinet['@_IsUrgent'] || "0",
        "@_ItemNo": cabinet['@_ItemNo'] || "",
        "@_Length": cabinet['@_Length'] || "0.00",
        "@_Material": cabinet['@_Material'] || "LR-19",
        "@_Model": cabinet['@_Model'] || "",
        "@_Name": cabinet['@_Name'] || customerName,
        "@_OrderCount": cabinet['@_OrderCount'] || "1",
        "@_OrderDate": cabinet['@_OrderDate'] || currentDateTime,
        "@_OrderName": cabinet['@_OrderName'] || customerName,
        "@_OrderNo": cabinet['@_OrderNo'] || orderNo,
        "@_OrderSortingNo": cabinet['@_OrderSortingNo'] || "0",
        "@_OrderType": cabinet['@_OrderType'] || "衣柜",
        "@_OriginalUid": cabinet['@_OriginalUid'] || "VIRTUALCABINET",
        "@_OutsideOrderNo": cabinet['@_OutsideOrderNo'] || "",
        "@_PartNumber": cabinet['@_PartNumber'] || "group-001",
        "@_RoomId": cabinet['@_RoomId'] || "0",
        "@_RoomName": cabinet['@_RoomName'] || customerName,
        "@_SchemeId": cabinet['@_SchemeId'] || "",
        "@_Series": cabinet['@_Series'] || "",
        "@_ShopName": cabinet['@_ShopName'] || customerName,
        "@_SignUserNickName": cabinet['@_SignUserNickName'] || "",
        "@_SubType": cabinet['@_SubType'] || "",
        "@_TaskID": cabinet['@_TaskID'] || "",
        "@_TaskNO": cabinet['@_TaskNO'] || "",
        "@_Tel": cabinet['@_Tel'] || "",
        "@_ThickEdgeValue": cabinet['@_ThickEdgeValue'] || "1.00",
        "@_ThinEdgeValue": cabinet['@_ThinEdgeValue'] || "1.00",
        "@_Uid": cabinet['@_Uid'] || "VIRTUALCABINET",
        "@_Uid2": cabinet['@_Uid2'] || "virtualcabinet",
        "@_Width": cabinet['@_Width'] || "0.00",
        "@_bomUserRealName": cabinet['@_bomUserRealName'] || customerName,
        "@_cityName": cabinet['@_cityName'] || "",
        "@_contractNo": cabinet['@_contractNo'] || "",
        "@_designerMobile": cabinet['@_designerMobile'] || "",
        "@_designerName": cabinet['@_designerName'] || customerName,
        "@_designerUserRealName": cabinet['@_designerUserRealName'] || customerName,
        "@_districtName": cabinet['@_districtName'] || "",
        "@_placeTypeD": cabinet['@_placeTypeD'] || "零售单",
        "@_provinceName": cabinet['@_provinceName'] || "",
        "@_shopOrderCode": cabinet['@_shopOrderCode'] || shopOrderCode,
        "@_shopOrderName": cabinet['@_shopOrderName'] || customerName,
        "@_shopOrderSubmitTime": cabinet['@_shopOrderSubmitTime'] || currentDateTime,
        "@_submitName": cabinet['@_submitName'] || customerName,
        "Panels": {
          "Panel": cabinet.Panels && cabinet.Panels.Panel ? cabinet.Panels.Panel : []
        }
      };
      
      // 添加到Cabinet数组
      xmlTemplate.Root.Cabinet.push(cabinetNode);
    });
    
    // 如果没有提供Cabinet数据，则创建一个默认的Cabinet
    if (cabinets.length === 0) {
      const currentDate = new Date();
      const orderNo = 'F' + currentDate.toISOString().slice(2, 10).replace(/-/g, '');
      const shopOrderCode = 'S' + currentDate.toISOString().slice(2, 10).replace(/-/g, '') + '0001';
      const currentDateTime = currentDate.toISOString().slice(0, 19).replace('T', ' ');
      
      const defaultCabinet = {
        "@_Address": "",
        "@_AlongSys": "",
        "@_BasicMaterial": "亿维雅",
        "@_BatchNo": "PC018341992508290004",
        "@_BatchNoRemark": customerName,
        "@_CabinetNo": "1",
        "@_CabinetType": "group",
        "@_ClassType": "wardrobe",
        "@_Comment": "",
        "@_ContactAddress": "",
        "@_ContactRealName": customerName,
        "@_ContactWay": "",
        "@_CraftMark": "",
        "@_CustomAddress": "",
        "@_CustomId": "",
        "@_Customer": customerName,
        "@_DealerName": "",
        "@_DeliveryDate": "",
        "@_Designer": "",
        "@_DisOrderNickName": "",
        "@_DiyOrderNo": "",
        "@_GroupName": customerName,
        "@_Height": "0.00",
        "@_HouseType": "",
        "@_Id": "",
        "@_IsUrgent": "0",
        "@_ItemNo": "",
        "@_Length": "0.00",
        "@_Material": "LR-19",
        "@_Model": "",
        "@_Name": customerName,
        "@_OrderCount": "1",
        "@_OrderDate": currentDateTime,
        "@_OrderName": customerName,
        "@_OrderNo": orderNo,
        "@_OrderSortingNo": "0",
        "@_OrderType": "衣柜",
        "@_OriginalUid": "VIRTUALCABINET",
        "@_OutsideOrderNo": "",
        "@_PartNumber": "group-001",
        "@_RoomId": "0",
        "@_RoomName": customerName,
        "@_SchemeId": "",
        "@_Series": "",
        "@_ShopName": customerName,
        "@_SignUserNickName": "",
        "@_SubType": "",
        "@_TaskID": "",
        "@_TaskNO": "",
        "@_Tel": "",
        "@_ThickEdgeValue": "1.00",
        "@_ThinEdgeValue": "1.00",
        "@_Uid": "VIRTUALCABINET",
        "@_Uid2": "virtualcabinet",
        "@_Width": "0.00",
        "@_bomUserRealName": customerName,
        "@_cityName": "",
        "@_contractNo": "",
        "@_designerMobile": "",
        "@_designerName": customerName,
        "@_designerUserRealName": customerName,
        "@_districtName": "",
        "@_placeTypeD": "零售单",
        "@_provinceName": "",
        "@_shopOrderCode": shopOrderCode,
        "@_shopOrderName": customerName,
        "@_shopOrderSubmitTime": currentDateTime,
        "@_submitName": customerName,
        "Panels": {
          "Panel": [] // 空的Panel数组
        }
      };
      
      xmlTemplate.Root.Cabinet.push(defaultCabinet);
    }

    // 创建XML构建器
    const { XMLBuilder } = require('fast-xml-parser');
    const builder = new XMLBuilder({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
      textNodeName: '#text',
      suppressEmptyNode: true,
      format: true,
      indentBy: '\t',
      encoding: 'utf-8'
    });

    // 构建XML
    let simplifiedXml = builder.build(xmlTemplate);
    
    // 如果构建失败，尝试使用xml2js
    if (!simplifiedXml) {
      const xml2js = require('xml2js');
      const builder2 = new xml2js.Builder({
        headless: false,
        renderOpts: {
          pretty: true,
          indent: '\t'
        },
        xmldec: {
          version: '1.0',
          encoding: 'utf-8'
        }
      });
      simplifiedXml = builder2.buildObject(xmlTemplate);
    }

    // 保存为XML文件
    if (simplifiedXml) {
      fs.writeFileSync(tempXmlPath, simplifiedXml, 'utf8');
      console.log(`✓ 简化版XML文件已生成到 ${tempXmlPath}`);
      logSuccess(
        customerName,
        'XML_GENERATION',
        `简化版XML文件已生成到 ${tempXmlPath}`
      );
      return tempXmlPath;
    } else {
      console.warn('⚠ 无法生成简化版XML文件');
      logWarning(
        customerName,
        'XML_GENERATION',
        '无法生成简化版XML文件'
      );
      return null;
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
  generateTempXml
};