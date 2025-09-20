/**
 * 补件XML生成器
 * 用于生成补件XML文件
 */

const fs = require('fs');
const path = require('path');

/**
 * 生成补件XML内容
 * @param {Object} customerData - 客户数据
 * @param {string} replacementType - 补件类型
 * @param {Object} replacementParts - 需要补件的板件数据
 * @param {string} originalShipmentID - 原始出货ID
 * @param {string} reason - 补件原因
 * @returns {string} XML内容
 */
function generateReplacementXMLContent(customerData, replacementType, replacementParts, originalShipmentID, reason) {
  // 创建XML文档结构
  const xmlData = {
    CustomerOrder: {
      '@_type': 'replacement',
      CustomerInfo: {
        ID: customerData.id || '',
        Name: customerData.name || '',
        Address: customerData.address || '',
        Contact: customerData.contact || '',
        Phone: customerData.phone || ''
      },
      Parts: {
        Part: Array.isArray(replacementParts) ? replacementParts.map(part => ({
          ID: part.id || '',
          Quantity: part.quantity || 1,
          Description: part.description || ''
        })) : []
      },
      ReplacementInfo: {
        ReplacementType: replacementType,
        OriginalShipmentID: originalShipmentID,
        MarkedAt: new Date().toISOString(),
        Reason: reason
      }
    }
  };

  // 生成XML字符串（简化处理）
  return `<?xml version="1.0" encoding="UTF-8"?>
<CustomerOrder type="replacement">
  <CustomerInfo>
    <ID>${customerData.id || ''}</ID>
    <Name>${customerData.name || ''}</Name>
    <Address>${customerData.address || ''}</Address>
    <Contact>${customerData.contact || ''}</Contact>
    <Phone>${customerData.phone || ''}</Phone>
  </CustomerInfo>
  <Parts>
    ${Array.isArray(replacementParts) ? replacementParts.map(part => `
    <Part>
      <ID>${part.id || ''}</ID>
      <Quantity>${part.quantity || 1}</Quantity>
      <Description>${part.description || ''}</Description>
    </Part>`).join('') : ''}
  </Parts>
  <ReplacementInfo>
    <ReplacementType>${replacementType}</ReplacementType>
    <OriginalShipmentID>${originalShipmentID}</OriginalShipmentID>
    <MarkedAt>${new Date().toISOString()}</MarkedAt>
    <Reason>${reason}</Reason>
  </ReplacementInfo>
</CustomerOrder>`;
}

/**
 * 生成补件XML文件路径
 * @param {Object} customerData - 客户数据
 * @param {string} outputPath - 输出路径
 * @returns {string} XML文件路径
 */
function getReplacementXMLPath(customerData, outputPath) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const fileName = `replacement_${customerData.name || 'customer'}_${timestamp}.xml`;
  return path.join(outputPath || customerData.outputPath || '.', fileName);
}

/**
 * 验证客户信息完整性
 * @param {Object} customerData - 客户数据
 * @throws {Error} 如果客户信息不完整
 */
function validateCustomerInfo(customerData) {
  const requiredFields = ['id', 'name'];
  for (const field of requiredFields) {
    if (!customerData[field]) {
      throw new Error(`缺少必要的客户信息字段: ${field}`);
    }
  }
}

/**
 * 生成补件XML
 * @param {Object} customerData - 客户数据
 * @param {string} replacementType - 补件类型
 * @param {Object} replacementParts - 需要补件的板件数据
 * @param {string} originalShipmentID - 原始出货ID
 * @param {string} reason - 补件原因
 * @returns {Object} 生成结果
 */
function generateReplacementXML(customerData, replacementType, replacementParts, originalShipmentID, reason) {
  // 1. 验证出货状态是否允许生成补件
  if (customerData.status === 'unshipped') {
    throw new Error('未出货客户不可生成补件XML');
  }
  
  // 2. 验证补件类型是否有效
  const validReplacementTypes = ['partial', 'full'];
  if (!validReplacementTypes.includes(replacementType)) {
    throw new Error(`无效的补件类型: ${replacementType}`);
  }
  
  // 3. 验证补件类型与出货状态的兼容性
  if (replacementType === 'full' && customerData.status === 'partial') {
    throw new Error('部分出货客户只能生成部分补件XML');
  }
  
  // 4. 验证客户信息完整性
  validateCustomerInfo(customerData);
  
  // 5. 生成XML内容
  const xmlContent = generateReplacementXMLContent(customerData, replacementType, replacementParts, originalShipmentID, reason);
  
  // 6. 保存到补件目录
  const xmlFilePath = getReplacementXMLPath(customerData);
  fs.writeFileSync(xmlFilePath, xmlContent, 'utf-8');
  
  return {
    filePath: xmlFilePath,
    type: replacementType,
    customerID: customerData.id,
    timestamp: new Date().toISOString()
  };
}

/**
 * 合并补件信息到原始XML（未出货状态）
 * @param {string} originalXmlPath - 原始XML路径
 * @param {Object} replacementParts - 补件板件数据
 * @returns {string} 更新后的XML内容
 */
function mergeReplacementWithOriginalXML(originalXmlPath, replacementParts) {
  // 读取原始XML内容
  if (!fs.existsSync(originalXmlPath)) {
    throw new Error(`原始XML文件不存在: ${originalXmlPath}`);
  }
  
  const originalXmlContent = fs.readFileSync(originalXmlPath, 'utf-8');
  
  // 这里应该解析XML并添加补件信息，简化处理直接返回原始内容
  // 实际实现需要根据具体的XML结构进行处理
  return originalXmlContent;
}

module.exports = {
  generateReplacementXMLContent,
  getReplacementXMLPath,
  validateCustomerInfo,
  generateReplacementXML,
  mergeReplacementWithOriginalXML
};