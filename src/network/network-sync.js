const fs = require('fs').promises;
const path = require('path');
const ExcelJS = require('exceljs');
const { logInfo, logWarning, logError, logSuccess } = require('../utils/logger');

// 网络状态检查相关常量
const NETWORK_CHECK_INTERVAL = 30000; // 30秒检查一次网络状态
const MAX_RETRY_ATTEMPTS = 3; // 最大重试次数
const RETRY_DELAY = 5000; // 重试延迟5秒

// 网络状态
let isNetworkAvailable = false;
let lastSyncTime = null;
let pendingSyncQueue = []; // 待同步队列

/**
 * 检查网络路径是否可访问
 * @param {string} networkPath - 网络路径
 * @returns {Promise<boolean>} 网络是否可访问
 */
async function checkNetworkAccess(networkPath) {
  try {
    await fs.access(networkPath, fs.constants.W_OK);
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * 检查是否需要强制同步（断线重连后）
 * @param {string} localPath - 本地路径
 * @returns {Promise<boolean>} 是否需要强制同步
 */
async function checkForceSync(localPath) {
  try {
    const lastSyncFile = path.join(localPath, 'last_sync.timestamp');
    try {
      await fs.access(lastSyncFile);
      const lastSyncTime = new Date(await fs.readFile(lastSyncFile, 'utf8'));
      const now = new Date();
      const diffHours = Math.abs(now - lastSyncTime) / 36e5; // 小时差
      
      // 如果断开连接超过24小时，标记为需要强制同步
      if (diffHours > 24) {
        return true;
      }
    } catch (error) {
      // 文件不存在，不需要强制同步
      return false;
    }
    return false;
  } catch (error) {
    console.warn('检查强制同步时出错:', error.message);
    return false;
  }
}

/**
 * 更新最后同步时间戳
 * @param {string} localPath - 本地路径
 */
async function updateLastSyncTime(localPath) {
  try {
    const lastSyncFile = path.join(localPath, 'last_sync.timestamp');
    await fs.writeFile(lastSyncFile, new Date().toISOString(), 'utf8');
    lastSyncTime = new Date();
  } catch (error) {
    console.warn('更新最后同步时间戳时出错:', error.message);
  }
}

/**
 * 延迟函数
 * @param {number} ms - 毫秒数
 * @returns {Promise<void>}
 */
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 重试函数
 * @param {Function} fn - 要重试的函数
 * @param {number} maxRetries - 最大重试次数
 * @param {number} delayMs - 延迟毫秒数
 * @returns {Promise<any>} 函数执行结果
 */
async function retry(fn, maxRetries = MAX_RETRY_ATTEMPTS, delayMs = RETRY_DELAY) {
  let lastError;
  
  for (let i = 0; i <= maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (i < maxRetries) {
        console.log(`操作失败，${delayMs}ms后进行第${i + 1}次重试...`);
        await delay(delayMs);
      }
    }
  }
  
  throw lastError;
}

/**
 * 增量同步Excel文件到网络路径
 * @param {Object} syncData - 同步数据
 * @param {string} syncData.outputDir - 本地输出目录
 * @param {string} syncData.customerName - 客户名称
 * @param {Array} syncData.packagedRows - 已打包的行数据索引
 * @param {number} syncData.totalRows - 总行数
 * @param {Object} config - 配置对象
 * @returns {Promise<Object>} 同步结果
 */
async function incrementalSyncToNetwork(syncData, config) {
  const { outputDir, customerName, packagedRows, totalRows } = syncData;
  
  try {
    // 检查网络路径是否可访问
    const networkAccessible = await checkNetworkAccess(config.networkPath);
    if (!networkAccessible) {
      // 网络不可访问，将同步任务加入待处理队列
      pendingSyncQueue.push({ ...syncData, timestamp: new Date() });
      console.log('ℹ 网络不可访问，同步任务已加入待处理队列');
      logInfo(customerName, 'NETWORK_SYNC', '网络不可访问，同步任务已加入待处理队列');
      return { success: false, message: '网络不可访问，任务已加入队列' };
    }

    // 创建目标文件夹名称
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    let targetFolderName = `${dateStr}_${customerName}`;

    // 检查文件夹是否已存在，如果存在则添加时间戳
    const targetFolderPath = path.join(config.networkPath, targetFolderName);
    let folderExists = false;
    try {
      await fs.access(targetFolderPath);
      folderExists = true;
    } catch {
      folderExists = false;
    }

    if (folderExists) {
      const timestamp = new Date().getTime();
      targetFolderName = `${dateStr}_${customerName}_${timestamp}`;
    }

    // 创建目标文件夹
    const finalTargetPath = path.join(config.networkPath, targetFolderName);
    await fs.mkdir(finalTargetPath, { recursive: true });

    // 查找localPath中对应客户的Excel文件
    const customerLocalPath = path.join(config.localPath, customerName);
    let sourceExcelFile = null;
    let sourceExcelFileName = null;

    try {
      await fs.access(customerLocalPath);
      const files = await fs.readdir(customerLocalPath);
      sourceExcelFileName = files.find(file => file.endsWith('.xlsx'));
      if (sourceExcelFileName) {
        sourceExcelFile = path.join(customerLocalPath, sourceExcelFileName);
      }
    } catch {
      // customerLocalPath不存在
    }

    // 如果在localPath中未找到，则使用outputDir中的文件
    if (!sourceExcelFile) {
      const files = await fs.readdir(outputDir);
      sourceExcelFileName = files.find(file => file.endsWith('.xlsx'));
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
      if (rowNumber <= 2) {
        // 标题行和表头行
        const packagedRow = packagedWorksheet.addRow(row.values);
        const remainingRow = remainingWorksheet.addRow(row.values);

        // 复制行样式
        copyRowStyle(row, packagedRow);
        copyRowStyle(row, remainingRow);
      } else {
        // 数据行处理
        const rowIndex = rowNumber - 3; // 减去标题行和表头行

        if (packagedRows && packagedRows.includes(rowIndex)) {
          // 已打包数据
          const newRow = packagedWorksheet.addRow(row.values);
          copyRowStyle(row, newRow);

          // 为已打包数据行添加灰色背景
          newRow.eachCell(cell => {
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FFCCCCCC' },
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
    logSuccess(
      customerName,
      'NETWORK_SYNC',
      `已同步到网络路径: ${targetExcelFile}`
    );
    
    // 更新最后同步时间
    await updateLastSyncTime(config.localPath);
    
    // 处理待同步队列中的任务
    if (pendingSyncQueue.length > 0) {
      console.log(`ℹ 发现${pendingSyncQueue.length}个待处理的同步任务，开始处理...`);
      logInfo('SYSTEM', 'NETWORK_SYNC', `发现${pendingSyncQueue.length}个待处理的同步任务，开始处理...`);
      
      // 处理待同步队列
      const queueCopy = [...pendingSyncQueue];
      pendingSyncQueue = [];
      
      for (const pendingSync of queueCopy) {
        try {
          await incrementalSyncToNetwork(pendingSync, config);
        } catch (error) {
          console.error(`✗ 处理待同步任务时出错: ${error.message}`);
          logError(
            pendingSync.customerName,
            'NETWORK_SYNC',
            `处理待同步任务时出错: ${error.message}`,
            error.stack
          );
          // 如果处理失败，重新加入队列
          pendingSyncQueue.push(pendingSync);
        }
      }
    }
    
    return { success: true, message: '同步成功' };
  } catch (error) {
    console.error(`✗ 网络同步失败: ${error.message}`);
    logError(
      customerName,
      'NETWORK_SYNC',
      `网络同步失败: ${error.message}`,
      error.stack
    );
    
    // 如果是网络问题，将任务加入待处理队列
    if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED' || 
        error.message.includes('network') || error.message.includes('access')) {
      pendingSyncQueue.push({ ...syncData, timestamp: new Date() });
      console.log('ℹ 同步失败已加入待处理队列，等待网络恢复');
      logInfo(customerName, 'NETWORK_SYNC', '同步失败已加入待处理队列，等待网络恢复');
    }
    
    return { success: false, message: error.message };
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

/**
 * 网络状态监控函数
 * @param {Object} config - 配置对象
 */
async function monitorNetworkStatus(config) {
  try {
    const networkAccessible = await checkNetworkAccess(config.networkPath);
    
    if (networkAccessible && !isNetworkAvailable) {
      // 网络恢复
      console.log('ℹ 网络连接已恢复');
      logInfo('SYSTEM', 'NETWORK_MONITOR', '网络连接已恢复');
      
      // 处理待同步队列
      if (pendingSyncQueue.length > 0) {
        console.log(`ℹ 发现${pendingSyncQueue.length}个待处理的同步任务，开始处理...`);
        logInfo('SYSTEM', 'NETWORK_MONITOR', `发现${pendingSyncQueue.length}个待处理的同步任务，开始处理...`);
        
        const queueCopy = [...pendingSyncQueue];
        pendingSyncQueue = [];
        
        for (const pendingSync of queueCopy) {
          try {
            await retry(() => incrementalSyncToNetwork(pendingSync, config));
          } catch (error) {
            console.error(`✗ 处理待同步任务时出错: ${error.message}`);
            logError(
              pendingSync.customerName,
              'NETWORK_MONITOR',
              `处理待同步任务时出错: ${error.message}`,
              error.stack
            );
            // 如果处理失败，重新加入队列
            pendingSyncQueue.push(pendingSync);
          }
        }
      }
    }
    
    isNetworkAvailable = networkAccessible;
  } catch (error) {
    isNetworkAvailable = false;
  }
}

/**
 * 启动网络状态监控
 * @param {Object} config - 配置对象
 */
function startNetworkMonitoring(config) {
  console.log('✓ 网络监控已启动');
  logInfo('SYSTEM', 'NETWORK_MONITOR', '启动网络状态监控');
  
  // 立即检查一次
  monitorNetworkStatus(config);
  
  // 定期检查网络状态
  setInterval(() => {
    monitorNetworkStatus(config);
  }, NETWORK_CHECK_INTERVAL);
}

/**
 * 获取待处理同步任务数量
 * @returns {number} 待处理任务数量
 */
function getPendingSyncCount() {
  return pendingSyncQueue.length;
}

module.exports = {
  incrementalSyncToNetwork,
  startNetworkMonitoring,
  getPendingSyncCount,
  checkForceSync
};