/**
 * 补件数据模型
 * 用于管理补件数据的持久化存储
 */

const fs = require('fs');
const path = require('path');

// 数据文件路径
const dataDir = path.join(__dirname, '../../data');
const replacementDataPath = path.join(dataDir, 'replacements.json');

// 确保数据目录存在
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// 初始化数据文件
if (!fs.existsSync(replacementDataPath)) {
  fs.writeFileSync(replacementDataPath, JSON.stringify([]));
}

/**
 * 补件数据结构定义
 * 
 * ReplacementData = {
 *   id: string,                    // 补件记录ID
 *   customerId: string,            // 客户ID
 *   customerName: string,          // 客户名称
 *   replacementType: string,       // 补件类型 (partial/full)
 *   status: string,                // 补件状态 (pending/processing/completed/cancelled)
 *   parts: Array,                  // 补件板件列表
 *   originalShipmentId: string,    // 原始出货ID
 *   reason: string,                // 补件原因
 *   createdAt: string,             // 创建时间
 *   updatedAt: string,             // 更新时间
 *   completedAt: string,           // 完成时间
 *   xmlFilePath: string            // 补件XML文件路径
 * }
 */

/**
 * 创建补件记录
 * @param {Object} replacementData - 补件数据
 * @returns {Promise<Object>} 创建的补件记录
 */
async function createReplacement(replacementData) {
  return new Promise((resolve, reject) => {
    try {
      // 读取现有数据
      const replacements = JSON.parse(fs.readFileSync(replacementDataPath, 'utf8'));
      
      // 创建新补件记录
      const newReplacement = {
        id: replacements.length > 0 ? Math.max(...replacements.map(r => r.id)) + 1 : 1,
        customerId: replacementData.customerId,
        customerName: replacementData.customerName,
        replacementType: replacementData.replacementType,
        status: replacementData.status || 'pending',
        parts: replacementData.parts || [],
        originalShipmentId: replacementData.originalShipmentId,
        reason: replacementData.reason,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        completedAt: replacementData.completedAt || null,
        xmlFilePath: replacementData.xmlFilePath || null
      };
      
      // 添加到数据数组
      replacements.push(newReplacement);
      
      // 保存数据
      fs.writeFileSync(replacementDataPath, JSON.stringify(replacements, null, 2));
      
      resolve(newReplacement);
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * 根据ID获取补件记录
 * @param {string|number} id - 补件记录ID
 * @returns {Promise<Object|null>} 补件记录或null
 */
async function getReplacementById(id) {
  return new Promise((resolve, reject) => {
    try {
      const replacements = JSON.parse(fs.readFileSync(replacementDataPath, 'utf8'));
      const replacement = replacements.find(r => r.id == id);
      resolve(replacement || null);
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * 根据客户ID获取补件记录
 * @param {string|number} customerId - 客户ID
 * @returns {Promise<Array>} 补件记录数组
 */
async function getReplacementsByCustomerId(customerId) {
  return new Promise((resolve, reject) => {
    try {
      const replacements = JSON.parse(fs.readFileSync(replacementDataPath, 'utf8'));
      const customerReplacements = replacements.filter(r => r.customerId == customerId);
      resolve(customerReplacements);
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * 获取所有补件记录
 * @returns {Promise<Array>} 所有补件记录
 */
async function getAllReplacements() {
  return new Promise((resolve, reject) => {
    try {
      const replacements = JSON.parse(fs.readFileSync(replacementDataPath, 'utf8'));
      resolve(replacements);
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * 更新补件记录
 * @param {string|number} id - 补件记录ID
 * @param {Object} updateData - 更新数据
 * @returns {Promise<Object|null>} 更新后的补件记录或null
 */
async function updateReplacement(id, updateData) {
  return new Promise((resolve, reject) => {
    try {
      const replacements = JSON.parse(fs.readFileSync(replacementDataPath, 'utf8'));
      const replacementIndex = replacements.findIndex(r => r.id == id);
      
      if (replacementIndex === -1) {
        resolve(null);
        return;
      }
      
      // 更新记录
      replacements[replacementIndex] = {
        ...replacements[replacementIndex],
        ...updateData,
        updatedAt: new Date().toISOString()
      };
      
      // 如果状态变更为完成，设置完成时间
      if (updateData.status === 'completed' && 
          replacements[replacementIndex].status !== 'completed') {
        replacements[replacementIndex].completedAt = new Date().toISOString();
      }
      
      // 保存数据
      fs.writeFileSync(replacementDataPath, JSON.stringify(replacements, null, 2));
      
      resolve(replacements[replacementIndex]);
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * 删除补件记录
 * @param {string|number} id - 补件记录ID
 * @returns {Promise<boolean>} 是否删除成功
 */
async function deleteReplacement(id) {
  return new Promise((resolve, reject) => {
    try {
      const replacements = JSON.parse(fs.readFileSync(replacementDataPath, 'utf8'));
      const initialLength = replacements.length;
      const filteredReplacements = replacements.filter(r => r.id != id);
      
      // 保存数据
      fs.writeFileSync(replacementDataPath, JSON.stringify(filteredReplacements, null, 2));
      
      resolve(filteredReplacements.length < initialLength);
    } catch (error) {
      reject(error);
    }
  });
}

module.exports = {
  createReplacement,
  getReplacementById,
  getReplacementsByCustomerId,
  getAllReplacements,
  updateReplacement,
  deleteReplacement
};