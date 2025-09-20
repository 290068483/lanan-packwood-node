/**
 * 自动补件处理服务
 * 监控补件目录，自动处理补件XML文件
 */

const fs = require('fs');
const path = require('path');
const chokidar = require('chokidar');
const { XMLParser, XMLBuilder } = require('fast-xml-parser');
const { getCustomerById } = require('../database/models/customer-fs');
const { updateReplacementStatus } = require('../utils/replacement-manager');
const { upsertCustomer } = require('../utils/data-manager');
const { createReplacement } = require('../database/models/replacement');
const { logInfo, logError, logWarning } = require('../utils/logger');

// 补件处理器类
class ReplacementProcessor {
  constructor(options = {}) {
    this.sourcePath = options.sourcePath || './source';
    this.replacementPath = options.replacementPath || path.join(this.sourcePath, 'replacement');
    this.isWatching = false;
    this.watcher = null;
  }

  /**
   * 启动补件监控
   */
  startWatching() {
    if (this.isWatching) {
      logWarning('ReplacementProcessor', '补件监控已启动');
      return;
    }

    // 检查补件目录是否存在
    if (!fs.existsSync(this.replacementPath)) {
      logInfo('ReplacementProcessor', `补件目录不存在: ${this.replacementPath}`);
      return;
    }

    // 创建文件监控
    this.watcher = chokidar.watch(this.replacementPath, {
      ignored: /(^|[\/\\])\../, // 忽略隐藏文件
      persistent: true,
      ignoreInitial: true,
      awaitWriteFinish: {
        stabilityThreshold: 2000,
        pollInterval: 100
      }
    });

    // 监听文件添加事件
    this.watcher.on('add', (filePath) => {
      if (path.extname(filePath).toLowerCase() === '.xml') {
        logInfo('ReplacementProcessor', `检测到新的补件XML文件: ${filePath}`);
        this.processReplacementFile(filePath);
      }
    });

    this.isWatching = true;
    logInfo('ReplacementProcessor', `开始监控补件目录: ${this.replacementPath}`);
  }

  /**
   * 停止补件监控
   */
  stopWatching() {
    if (this.watcher) {
      this.watcher.close();
      this.watcher = null;
      this.isWatching = false;
      logInfo('ReplacementProcessor', '停止监控补件目录');
    }
  }

  /**
   * 处理补件XML文件
   * @param {string} filePath - XML文件路径
   */
  async processReplacementFile(filePath) {
    try {
      // 读取XML文件内容
      const xmlContent = fs.readFileSync(filePath, 'utf-8');
      
      // 解析XML
      const parser = new XMLParser({
        ignoreAttributes: false,
        attributeNamePrefix: '@_',
        textNodeName: 'text',
        parseAttributeValue: true,
        parseTagValue: true,
        allowBooleanAttributes: true
      });
      
      const parsedData = parser.parse(xmlContent);
      
      // 提取客户UID
      const customerUID = this.extractCustomerUID(parsedData);
      if (!customerUID) {
        logWarning('ReplacementProcessor', `无法从XML文件中提取客户UID: ${filePath}`);
        return;
      }
      
      // 查询客户信息
      const customer = await getCustomerById(customerUID);
      if (!customer) {
        logWarning('ReplacementProcessor', `未找到UID为 ${customerUID} 的客户`);
        return;
      }
      
      // 根据出货状态处理补件
      await this.handleReplacementByShippingStatus(customer, parsedData, filePath);
      
      // 记录处理日志
      logInfo('ReplacementProcessor', `补件文件处理完成: ${filePath} for customer ${customer.name}`);
    } catch (error) {
      logError('ReplacementProcessor', `处理补件文件失败: ${filePath}, 错误: ${error.message}`);
    }
  }

  /**
   * 从XML数据中提取客户UID
   * @param {Object} xmlData - 解析后的XML数据
   * @returns {string|null} 客户UID或null
   */
  extractCustomerUID(xmlData) {
    try {
      // 尝试从不同可能的位置提取UID
      if (xmlData.CustomerOrder && xmlData.CustomerOrder.CustomerInfo) {
        return xmlData.CustomerOrder.CustomerInfo.ID || 
               xmlData.CustomerOrder.CustomerInfo.UID ||
               xmlData.CustomerOrder.CustomerInfo['@_id'] ||
               xmlData.CustomerOrder.CustomerInfo['@_uid'];
      }
      
      if (xmlData.CustomerOrder && xmlData.CustomerOrder['@_customerId']) {
        return xmlData.CustomerOrder['@_customerId'];
      }
      
      return null;
    } catch (error) {
      logError('ReplacementProcessor', `提取客户UID失败: ${error.message}`);
      return null;
    }
  }

  /**
   * 根据出货状态处理补件
   * @param {Object} customer - 客户数据
   * @param {Object} xmlData - 解析后的XML数据
   * @param {string} filePath - XML文件路径
   */
  async handleReplacementByShippingStatus(customer, xmlData, filePath) {
    try {
      // 获取客户的出货状态
      const shippingStatus = customer.status;
      
      // 根据出货状态决定处理方式
      let replacementType, replacementStatus;
      
      switch (shippingStatus) {
        case 'unshipped':
          // 未出货状态：合并到原始XML
          logInfo('ReplacementProcessor', `客户 ${customer.name} 未出货，将合并补件到原始XML`);
          await this.mergeWithOriginalXML(customer, xmlData, filePath);
          replacementType = 'merge';
          replacementStatus = 'none'; // 合并后无需补件状态
          break;
          
        case 'partial':
        case 'shipped':
          // 已出货状态：生成新的补件XML
          logInfo('ReplacementProcessor', `客户 ${customer.name} 已出货，将生成新的补件XML`);
          await this.generateNewReplacementXML(customer, xmlData, filePath);
          replacementType = 'new';
          replacementStatus = this.determineReplacementStatus(xmlData, shippingStatus);
          break;
          
        default:
          logWarning('ReplacementProcessor', `客户 ${customer.name} 的出货状态未知: ${shippingStatus}`);
          return;
      }
      
      // 更新客户补件状态
      if (replacementStatus && replacementStatus !== 'none') {
        const updatedCustomer = updateReplacementStatus(
          customer,
          replacementStatus,
          '系统',
          `自动处理补件文件: ${path.basename(filePath)}`
        );
        
        // 保存更新后的客户数据
        await upsertCustomer(updatedCustomer);
      }
      
      // 记录补件处理记录
      await createReplacement({
        customerId: customer.id,
        customerName: customer.name,
        replacementType: replacementType,
        status: 'completed',
        parts: this.extractReplacementParts(xmlData),
        originalShipmentId: this.extractOriginalShipmentId(xmlData),
        reason: `自动处理补件，出货状态: ${shippingStatus}`,
        xmlFilePath: filePath
      });
    } catch (error) {
      logError('ReplacementProcessor', `根据出货状态处理补件失败: ${error.message}`);
      throw error;
    }
  }

  /**
   * 合并补件到原始XML（未出货状态）
   * @param {Object} customer - 客户数据
   * @param {Object} replacementXmlData - 解析后的补件XML数据
   * @param {string} replacementFilePath - 补件XML文件路径
   */
  async mergeWithOriginalXML(customer, replacementXmlData, replacementFilePath) {
    try {
      // 获取原始XML路径
      const originalXmlPath = path.join(customer.outputPath, `${customer.name}.xml`);
      
      // 检查原始XML是否存在
      if (!fs.existsSync(originalXmlPath)) {
        logWarning('ReplacementProcessor', `原始XML文件不存在: ${originalXmlPath}`);
        return;
      }
      
      // 读取并解析原始XML
      const originalXmlContent = fs.readFileSync(originalXmlPath, 'utf-8');
      const parser = new XMLParser({
        ignoreAttributes: false,
        attributeNamePrefix: '@_',
        textNodeName: 'text',
        parseAttributeValue: true,
        parseTagValue: true,
        allowBooleanAttributes: true
      });
      
      const originalXmlData = parser.parse(originalXmlContent);
      
      // 合并XML数据
      const mergedXmlData = this.mergeXmlData(originalXmlData, replacementXmlData, customer);
      
      // 构建合并后的XML
      const builder = new XMLBuilder({
        ignoreAttributes: false,
        attributeNamePrefix: '@_',
        format: true,
        suppressEmptyNode: true
      });
      
      const mergedXmlContent = builder.build(mergedXmlData);
      
      // 备份原始文件
      const backupPath = `${originalXmlPath}.backup.${Date.now()}`;
      fs.copyFileSync(originalXmlPath, backupPath);
      logInfo('ReplacementProcessor', `原始XML已备份: ${backupPath}`);
      
      // 写入合并后的XML到原始文件
      fs.writeFileSync(originalXmlPath, mergedXmlContent, 'utf-8');
      logInfo('ReplacementProcessor', `补件已合并到原始XML: ${originalXmlPath}`);
    } catch (error) {
      logError('ReplacementProcessor', `合并补件到原始XML失败: ${error.message}`);
      throw error;
    }
  }

  /**
   * 合并XML数据
   * @param {Object} originalData - 原始XML数据
   * @param {Object} replacementData - 补件XML数据
   * @param {Object} customer - 客户数据
   * @returns {Object} 合并后的XML数据
   */
  mergeXmlData(originalData, replacementData, customer) {
    // 创建合并后的数据副本
    const mergedData = JSON.parse(JSON.stringify(originalData));
    
    try {
      // 确保CustomerInfo存在并补全客户信息
      if (!mergedData.CustomerOrder) {
        mergedData.CustomerOrder = {};
      }
      
      if (!mergedData.CustomerOrder.CustomerInfo) {
        mergedData.CustomerOrder.CustomerInfo = {};
      }
      
      // 补全客户信息
      mergedData.CustomerOrder.CustomerInfo = {
        ID: customer.id,
        Name: customer.name,
        Address: customer.address || '',
        Contact: customer.contact || '',
        Phone: customer.phone || '',
        ...mergedData.CustomerOrder.CustomerInfo // 保留原始数据
      };
      
      // 合并Parts信息
      if (replacementData.CustomerOrder && replacementData.CustomerOrder.Parts) {
        if (!mergedData.CustomerOrder.Parts) {
          mergedData.CustomerOrder.Parts = {};
        }
        
        // 如果原始XML没有Part，直接使用补件的Part
        if (!mergedData.CustomerOrder.Parts.Part) {
          mergedData.CustomerOrder.Parts.Part = replacementData.CustomerOrder.Parts.Part;
        } else {
          // 合并Part数组
          const originalParts = Array.isArray(mergedData.CustomerOrder.Parts.Part) 
            ? mergedData.CustomerOrder.Parts.Part 
            : [mergedData.CustomerOrder.Parts.Part];
            
          const replacementParts = Array.isArray(replacementData.CustomerOrder.Parts.Part) 
            ? replacementData.CustomerOrder.Parts.Part 
            : [replacementData.CustomerOrder.Parts.Part];
          
          // 合并并去重
          const mergedParts = [...originalParts];
          replacementParts.forEach(replacementPart => {
            const exists = mergedParts.some(part => part.ID === replacementPart.ID);
            if (!exists) {
              mergedParts.push(replacementPart);
            }
          });
          
          mergedData.CustomerOrder.Parts.Part = mergedParts;
        }
      }
      
      // 添加补件标识
      if (!mergedData.CustomerOrder.ReplacementInfo) {
        mergedData.CustomerOrder.ReplacementInfo = {};
      }
      
      mergedData.CustomerOrder.ReplacementInfo = {
        ...mergedData.CustomerOrder.ReplacementInfo,
        IsReplacement: "true",
        ReplacementProcessedAt: new Date().toISOString(),
        OriginalReplacementFile: path.basename(replacementFilePath)
      };
      
      return mergedData;
    } catch (error) {
      logError('ReplacementProcessor', `合并XML数据失败: ${error.message}`);
      return originalData; // 返回原始数据作为后备
    }
  }

  /**
   * 生成新的补件XML（已出货状态）
   * @param {Object} customer - 客户数据
   * @param {Object} replacementXmlData - 解析后的补件XML数据
   * @param {string} replacementFilePath - 补件XML文件路径
   */
  async generateNewReplacementXML(customer, replacementXmlData, replacementFilePath) {
    try {
      // 生成新的补件XML文件名
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const newFileName = `replacement_${customer.name}_${timestamp}.xml`;
      const newFilePath = path.join(customer.outputPath, newFileName);
      
      // 确保输出目录存在
      if (!fs.existsSync(customer.outputPath)) {
        fs.mkdirSync(customer.outputPath, { recursive: true });
      }
      
      // 补全客户信息到补件XML数据
      const enrichedReplacementData = this.enrichReplacementDataWithCustomerInfo(
        replacementXmlData, 
        customer,
        replacementFilePath
      );
      
      // 构建XML
      const builder = new XMLBuilder({
        ignoreAttributes: false,
        attributeNamePrefix: '@_',
        format: true,
        suppressEmptyNode: true
      });
      
      const xmlContent = builder.build(enrichedReplacementData);
      
      // 写入新的补件XML文件
      fs.writeFileSync(newFilePath, xmlContent, 'utf-8');
      
      logInfo('ReplacementProcessor', `生成新的补件XML文件: ${newFilePath}`);
    } catch (error) {
      logError('ReplacementProcessor', `生成新的补件XML失败: ${error.message}`);
      throw error;
    }
  }

  /**
   * 补全补件XML数据中的客户信息
   * @param {Object} replacementData - 补件XML数据
   * @param {Object} customer - 客户数据
   * @param {string} replacementFilePath - 补件XML文件路径
   * @returns {Object} 补全客户信息后的XML数据
   */
  enrichReplacementDataWithCustomerInfo(replacementData, customer, replacementFilePath) {
    // 创建数据副本
    const enrichedData = JSON.parse(JSON.stringify(replacementData));
    
    try {
      // 确保CustomerOrder节点存在
      if (!enrichedData.CustomerOrder) {
        enrichedData.CustomerOrder = {};
      }
      
      // 确保CustomerInfo节点存在并补全客户信息
      if (!enrichedData.CustomerOrder.CustomerInfo) {
        enrichedData.CustomerOrder.CustomerInfo = {};
      }
      
      enrichedData.CustomerOrder.CustomerInfo = {
        ID: customer.id,
        Name: customer.name,
        Address: customer.address || '',
        Contact: customer.contact || '',
        Phone: customer.phone || '',
        ...enrichedData.CustomerOrder.CustomerInfo // 保留原始数据
      };
      
      // 确保ReplacementInfo节点存在并添加补件标识
      if (!enrichedData.CustomerOrder.ReplacementInfo) {
        enrichedData.CustomerOrder.ReplacementInfo = {};
      }
      
      enrichedData.CustomerOrder.ReplacementInfo = {
        ...enrichedData.CustomerOrder.ReplacementInfo,
        IsReplacement: "true",
        ReplacementProcessedAt: new Date().toISOString(),
        OriginalReplacementFile: path.basename(replacementFilePath),
        CustomerStatus: customer.status
      };
      
      // 确保有type属性
      enrichedData.CustomerOrder['@_type'] = 'replacement';
      
      return enrichedData;
    } catch (error) {
      logError('ReplacementProcessor', `补全客户信息到补件XML失败: ${error.message}`);
      return replacementData; // 返回原始数据作为后备
    }
  }

  /**
   * 确定补件状态
   * @param {Object} xmlData - 解析后的XML数据
   * @param {string} shippingStatus - 出货状态
   * @returns {string} 补件状态
   */
  determineReplacementStatus(xmlData, shippingStatus) {
    // 根据XML内容和出货状态确定补件状态
    // 这里简化处理，实际应该根据XML中的具体补件信息来判断
    if (shippingStatus === 'partial') {
      return 'partial';
    } else if (shippingStatus === 'shipped') {
      // 可以根据补件数量等信息判断是部分还是全部补件
      return 'partial'; // 默认为部分补件
    }
    
    return 'none';
  }

  /**
   * 提取补件板件信息
   * @param {Object} xmlData - 解析后的XML数据
   * @returns {Array} 补件板件数组
   */
  extractReplacementParts(xmlData) {
    try {
      if (xmlData.CustomerOrder && xmlData.CustomerOrder.Parts && xmlData.CustomerOrder.Parts.Part) {
        const parts = xmlData.CustomerOrder.Parts.Part;
        // 如果是单个部件，转换为数组
        return Array.isArray(parts) ? parts : [parts];
      }
      return [];
    } catch (error) {
      logError('ReplacementProcessor', `提取补件板件信息失败: ${error.message}`);
      return [];
    }
  }

  /**
   * 提取原始出货ID
   * @param {Object} xmlData - 解析后的XML数据
   * @returns {string} 原始出货ID
   */
  extractOriginalShipmentId(xmlData) {
    try {
      if (xmlData.CustomerOrder && xmlData.CustomerOrder.ReplacementInfo) {
        return xmlData.CustomerOrder.ReplacementInfo.OriginalShipmentID ||
               xmlData.CustomerOrder.ReplacementInfo['@_originalShipmentId'] ||
               '';
      }
      return '';
    } catch (error) {
      logError('ReplacementProcessor', `提取原始出货ID失败: ${error.message}`);
      return '';
    }
  }
}

// 创建全局实例
const replacementProcessor = new ReplacementProcessor();

module.exports = {
  ReplacementProcessor,
  replacementProcessor
};