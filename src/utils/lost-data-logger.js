const fs = require('fs');
const path = require('path');

/**
 * 丢失数据记录器
 * 记录解析过程中丢失的数据信息
 */
class LostDataLogger {
  /**
   * 记录丢失的数据
   * @param {string} customerName - 客户名称
   * @param {string} lineName - 产线名称
   * @param {Array} lostData - 丢失的数据数组
   * @param {string} reason - 丢失原因
   */
  static logLostData(customerName, lineName, lostData, reason) {
    try {
      // 创建日志目录
      const logDir = path.join(__dirname, '..', 'logs', 'lost-data');
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
      }

      // 生成日志文件名（包含日期）
      const date = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
      const logFileName = `${date}_${customerName}_${lineName}_lost_data.json`;
      const logFilePath = path.join(logDir, logFileName);

      // 准备日志数据
      const logData = {
        timestamp: new Date().toISOString(),
        customerName,
        lineName,
        reason,
        lostCount: lostData.length,
        lostData: lostData.slice(0, 100), // 只记录前100个丢失项以避免文件过大
      };

      // 写入日志文件
      fs.writeFileSync(logFilePath, JSON.stringify(logData, null, 2), 'utf8');
      console.log(`✓ 已记录丢失数据到文件: ${logFilePath}`);
    } catch (error) {
      console.error('✗ 记录丢失数据时出错:', error.message);
    }
  }

  /**
   * 从XML解析结果中识别丢失的数据
   * @param {string} originalXml - 原始XML内容
   * @param {Object} parsedData - 解析后的数据
   * @param {string} customerName - 客户名称
   * @param {string} lineName - 产线名称
   */
  static identifyAndLogLostData(
    originalXml,
    parsedData,
    customerName,
    lineName
  ) {
    try {
      // 从原始XML中提取所有Panel节点
      const originalPanelMatches =
        originalXml.match(/<Panel\s+[^>]*>[\s\S]*?<\/Panel>/g) || [];

      // 从解析后的数据中提取Panel节点
      const parsedPanelCount = this.countPanelsInParsedData(parsedData);

      // 如果数量不匹配，记录丢失的数据
      if (originalPanelMatches.length !== parsedPanelCount) {
        const lostCount = originalPanelMatches.length - parsedPanelCount;
        console.warn(
          `⚠ 发现数据丢失: 客户"${customerName}" 产线"${lineName}" 丢失 ${lostCount} 个Panel节点`
        );

        // 记录丢失数据信息
        this.logLostData(
          customerName,
          lineName,
          originalPanelMatches.slice(parsedPanelCount),
          `解析后Panel数量(${parsedPanelCount})少于原始Panel数量(${originalPanelMatches.length})`
        );
      }
    } catch (error) {
      console.error('✗ 识别丢失数据时出错:', error.message);
    }
  }

  /**
   * 计算解析数据中的Panel数量
   * @param {Object} parsedData - 解析后的数据
   * @returns {number} Panel数量
   */
  static countPanelsInParsedData(parsedData) {
    try {
      if (!parsedData || !parsedData.Root) return 0;

      let panelCount = 0;
      const cabinets = Array.isArray(parsedData.Root.Cabinet)
        ? parsedData.Root.Cabinet
        : [parsedData.Root.Cabinet];

      cabinets.forEach(cabinet => {
        if (cabinet && cabinet.Panels && cabinet.Panels.Panel) {
          if (Array.isArray(cabinet.Panels.Panel)) {
            panelCount += cabinet.Panels.Panel.length;
          } else {
            panelCount += 1;
          }
        }
      });

      return panelCount;
    } catch (error) {
      console.error('✗ 计算Panel数量时出错:', error.message);
      return 0;
    }
  }
}

module.exports = LostDataLogger;
