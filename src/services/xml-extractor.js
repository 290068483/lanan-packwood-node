/**
 * XML文件数据提取服务
 * 从客户目录中的XML文件中提取数据
 */

const fs = require('fs');
const path = require('path');
const { XMLParser } = require('fast-xml-parser');
const { createOrUpdateCustomer } = require('../database/models/customer');

/**
 * 从客户目录中提取数据
 * @param {string} customerDirPath - 客户目录路径
 * @returns {Promise<Object>} 提取的客户数据
 */
async function extractCustomerData(customerDirPath) {
  try {
    // 检查客户目录是否存在
    if (!fs.existsSync(customerDirPath) || !fs.statSync(customerDirPath).isDirectory()) {
      throw new Error('客户目录不存在');
    }

    // 读取客户数据
    const customerDataPath = path.join(customerDirPath, 'customer.json');
    let customerData = {};
    if (fs.existsSync(customerDataPath)) {
      customerData = JSON.parse(fs.readFileSync(customerDataPath, 'utf8'));
    }

    // 读取packages.json数据
    const packagesPath = path.join(customerDirPath, 'packages.json');
    let packagesData = [];
    if (fs.existsSync(packagesPath)) {
      packagesData = JSON.parse(fs.readFileSync(packagesPath, 'utf8'));
    }

    // 读取XML文件
    const xmlFiles = fs.readdirSync(customerDirPath)
      .filter(file => file.endsWith('.xml'))
      .map(file => path.join(customerDirPath, file));

    // 解析XML文件
    const xmlParser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
      parseAttributeValue: true,
      parseTrueNumberOnly: true,
      arrayMode: true
    });

    let allPanels = [];
    for (const xmlFile of xmlFiles) {
      try {
        const xmlContent = fs.readFileSync(xmlFile, 'utf8');
        const xmlData = xmlParser.parse(xmlContent);

        // 提取面板数据
        const panels = extractPanelsFromXml(xmlData);
        allPanels = allPanels.concat(panels);
      } catch (error) {
        console.error(`解析XML文件 ${xmlFile} 出错:`, error);
      }
    }

    // 计算打包状态
    const packStatus = calculatePackStatus(allPanels, packagesData);

    // 构建客户数据对象
    const customerInfo = {
      name: customerData.name || path.basename(customerDirPath, '#').replace(/^\d{6}_/, ''),
      status: packStatus.status,
      packProgress: packStatus.packProgress,
      packedCount: packStatus.packedCount,
      totalParts: packStatus.totalParts,
      packSeqs: packStatus.packSeqs,
      lastUpdate: new Date().toISOString(),
      packDate: customerData.packDate || (packStatus.status === '已打包' ? new Date().toISOString() : null),
      archiveDate: customerData.archiveDate || null,
      shipmentDate: customerData.shipmentDate || null,
      statusHistory: customerData.statusHistory || [],
      panels: allPanels
    };

    return customerInfo;
  } catch (error) {
    console.error(`提取客户数据出错:`, error);
    throw error;
  }
}

/**
 * 从XML数据中提取面板信息
 * @param {Object} xmlData - XML数据
 * @returns {Array} 面板数据列表
 */
function extractPanelsFromXml(xmlData) {
  const panels = [];

  // 根据XML结构提取面板数据
  // 这里需要根据实际的XML结构调整
  try {
    // 假设XML结构如下：
    // Root -> Cabinets -> Cabinet -> Panels -> Panel

    // 查找所有Cabinet节点
    let cabinets = [];
    if (xmlData.Root && xmlData.Root.Cabinets && xmlData.Root.Cabinets.Cabinet) {
      cabinets = Array.isArray(xmlData.Root.Cabinets.Cabinet) 
        ? xmlData.Root.Cabinets.Cabinet 
        : [xmlData.Root.Cabinets.Cabinet];
    }

    // 遍历所有Cabinet，提取Panel数据
    for (const cabinet of cabinets) {
      if (cabinet.Panels && cabinet.Panels.Panel) {
        const cabinetPanels = Array.isArray(cabinet.Panels.Panel) 
          ? cabinet.Panels.Panel 
          : [cabinet.Panels.Panel];

        for (const panel of cabinetPanels) {
          // 提取面板信息
          const panelInfo = {
            id: panel['@_id'] || panel.ID || generatePanelId(),
            name: panel['@_name'] || panel.Name || '',
            width: parseFloat(panel['@_width'] || panel.Width || 0),
            height: parseFloat(panel['@_height'] || panel.Height || 0),
            thickness: parseFloat(panel['@_thickness'] || panel.Thickness || 0),
            material: panel['@_material'] || panel.Material || '',
            edgeBand: panel['@_edgeBand'] || panel.EdgeBand || '',
            edgeBandWidth: parseFloat(panel['@_edgeBandWidth'] || panel.EdgeBandWidth || 0),
            edgeBandColor: panel['@_edgeBandColor'] || panel.EdgeBandColor || '',
            isPacked: false
          };

          panels.push(panelInfo);
        }
      }
    }
  } catch (error) {
    console.error('提取面板数据出错:', error);
  }

  return panels;
}

/**
 * 计算打包状态
 * @param {Array} panels - 面板数据列表
 * @param {Array} packagesData - packages.json数据
 * @returns {Object} 打包状态信息
 */
function calculatePackStatus(panels, packagesData) {
  // 获取所有面板ID
  const allPartIDs = panels.map(panel => panel.id);

  // 如果没有面板数据，返回未打包状态
  if (allPartIDs.length === 0) {
    return {
      status: '未打包',
      packedCount: 0,
      totalParts: 0,
      packProgress: 0,
      packSeqs: []
    };
  }

  // 从packages.json中提取所有partIDs
  const allPackedPartIDs = [];
  const customerPackSeqs = [];

  if (packagesData && Array.isArray(packagesData)) {
    packagesData.forEach(packageItem => {
      if (packageItem.partIDs && Array.isArray(packageItem.partIDs)) {
        allPackedPartIDs.push(...packageItem.partIDs);

        // 检查这个包是否包含客户的板件
        const hasCustomerParts = packageItem.partIDs.some(partID => allPartIDs.includes(partID));
        if (hasCustomerParts) {
          customerPackSeqs.push(packageItem.packSeq);
        }
      }
    });
  }

  // 计算已打包的板件数
  let packedCount = 0;
  allPartIDs.forEach(partID => {
    if (allPackedPartIDs.includes(partID)) {
      packedCount++;

      // 更新面板的打包状态
      const panel = panels.find(p => p.id === partID);
      if (panel) {
        panel.isPacked = true;
      }
    }
  });

  // 计算打包进度
  const packProgress = Math.round((packedCount / allPartIDs.length) * 100);

  // 确定客户状态
  let status = '未打包';
  if (packProgress === 100) {
    status = '已打包';
  } else if (packProgress > 0) {
    status = '正在处理';
  }

  return {
    status,
    packedCount,
    totalParts: allPartIDs.length,
    packProgress,
    packSeqs: customerPackSeqs
  };
}

/**
 * 生成面板ID
 * @returns {string} 面板ID
 */
function generatePanelId() {
  return 'panel_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

/**
 * 从源路径提取所有客户数据
 * @param {string} sourcePath - 源路径
 * @returns {Promise<Array>} 客户数据列表
 */
async function extractAllCustomersData(sourcePath) {
  try {
    // 检查源路径是否存在
    if (!fs.existsSync(sourcePath) || !fs.statSync(sourcePath).isDirectory()) {
      throw new Error('源路径不存在');
    }

    // 读取源路径中的客户目录
    const customerDirs = fs.readdirSync(sourcePath)
      .filter(dir => {
        const fullPath = path.join(sourcePath, dir);
        return fs.statSync(fullPath).isDirectory();
      });

    // 处理每个客户目录
    const customers = [];
    for (const dir of customerDirs) {
      try {
        // 构建客户目录路径
        const customerDirPath = path.join(sourcePath, dir);

        // 提取客户数据
        const customerData = await extractCustomerData(customerDirPath);

        // 保存到数据库
        await createOrUpdateCustomer(customerData);

        customers.push(customerData);
      } catch (error) {
        console.error(`处理客户目录 ${dir} 出错:`, error);
      }
    }

    return customers;
  } catch (error) {
    console.error('提取所有客户数据出错:', error);
    throw error;
  }
}

module.exports = {
  extractCustomerData,
  extractAllCustomersData,
  extractPanelsFromXml,
  calculatePackStatus
};
