const fs = require('fs');
const path = require('path');
const { logSuccess, logWarning, logError } = require('./logger');

/**
 * 生成符合temp-pack目录中XML格式的temp.xml文件
 * @param {Array} panels - Panel数据数组
 * @param {string} tempXmlPath - temp.xml文件路径
 * @param {string} customerName - 客户名称
 * @param {string} lineDir - 产线目录名
 */
function generateTempXml(panels, tempXmlPath, customerName, lineDir) {
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
    
    // 创建虚拟 Cabinet 结构以匹配 temp-pack 目录中的 XML 格式
    const virtualCabinet = {
      '@_Address': '',
      '@_AlongSys': '',
      '@_BasicMaterial': '亿维雅',
      '@_BatchNo': 'PC018341992508290004',
      '@_BatchNoRemark': customerName,
      '@_CabinetNo': '1',
      '@_CabinetType': 'group',
      '@_ClassType': 'wardrobe',
      '@_Comment': '',
      '@_ContactAddress': '',
      '@_ContactRealName': customerName,
      '@_ContactWay': '',
      '@_CraftMark': '',
      '@_CustomAddress': '',
      '@_CustomId': '',
      '@_Customer': customerName,
      '@_DealerName': '',
      '@_DeliveryDate': '',
      '@_Designer': '',
      '@_DisOrderNickName': '',
      '@_DiyOrderNo': '',
      '@_GroupName': 'Virtual Cabinet',
      '@_Height': '0.00',
      '@_HouseType': '',
      '@_Id': '',
      '@_IsUrgent': '0',
      '@_ItemNo': '',
      '@_Length': '0.00',
      '@_Material': 'LR-19',
      '@_Model': '',
      '@_Name': 'Virtual Cabinet',
      '@_OrderCount': '1',
      '@_OrderDate': new Date().toISOString().slice(0, 19).replace('T', ' '),
      '@_OrderName': 'Virtual Cabinet',
      '@_OrderNo': 'F' + new Date().toISOString().slice(2, 10).replace(/-/g, ''),
      '@_OrderSortingNo': '0',
      '@_OrderType': '衣柜',
      '@_OriginalUid': 'VIRTUALCABINET',
      '@_OutsideOrderNo': '',
      '@_PartNumber': 'group-001',
      '@_RoomId': '0',
      '@_RoomName': 'Virtual Room',
      '@_SchemeId': '',
      '@_Series': '',
      '@_ShopName': 'Virtual Shop',
      '@_SignUserNickName': '',
      '@_SubType': '',
      '@_TaskID': '',
      '@_TaskNO': '',
      '@_Tel': '',
      '@_ThickEdgeValue': '1.00',
      '@_ThinEdgeValue': '1.00',
      '@_Uid': 'VIRTUALCABINET',
      '@_Uid2': 'virtualcabinet',
      '@_Width': '0.00',
      '@_bomUserRealName': 'Virtual User',
      '@_cityName': '',
      '@_contractNo': '',
      '@_designerMobile': '',
      '@_designerName': 'Virtual Designer',
      '@_designerUserRealName': 'Virtual Designer',
      '@_districtName': '',
      '@_placeTypeD': '零售单',
      '@_provinceName': '',
      '@_shopOrderCode': 'S' + new Date().toISOString().slice(2, 10).replace(/-/g, '') + '0001',
      '@_shopOrderName': customerName,
      '@_shopOrderSubmitTime': new Date().toISOString(),
      '@_submitName': 'Virtual User',
      Panels: {
        Panel: panels
      }
    };
    
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

    // 构建符合temp-pack目录中XML格式的数据结构
    const simplifiedData = {
      '?xml': {
        '@_version': '1.0',
        '@_encoding': 'utf-8'
      },
      Root: {
        Cabinet: virtualCabinet
      }
    };

    // 构建XML
    let simplifiedXml = builder.build(simplifiedData);
    
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
      simplifiedXml = builder2.buildObject(simplifiedData);
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