/**
 * 数据同步服务
 * 监控源目录并同步数据到输出目录
 */

const fs = require('fs');
const path = require('path');
const chokidar = require('chokidar');
const { logInfo, logError, logWarning, logSuccess } = require('../utils/logger');
const { processXMLFile } = require('../utils/xml-parser');
const { processCustomerData } = require('../utils/customer-data-processor');
const NetworkSync = require('../network/network-sync');
const { replacementProcessor } = require('./replacement-processor');

// 全局变量
let watcher = null;
let isWatching = false;
let sourcePath = '';
let outputPath = '';

/**
 * 初始化数据同步服务
 * @param {string} srcPath - 源目录路径
 * @param {string} outPath - 输出目录路径
 */
function initialize(srcPath, outPath) {
  sourcePath = srcPath;
  outputPath = outPath;
  
  // 初始化补件处理器
  replacementProcessor.sourcePath = srcPath;
  
  logInfo('DataSyncService', `数据同步服务初始化: 源路径=${srcPath}, 输出路径=${outPath}`);
}

/**
 * 启动数据同步服务
 */
function startWatching() {
  if (isWatching) {
    logWarning('DataSyncService', '数据同步服务已在运行中');
    return;
  }

  if (!sourcePath || !outputPath) {
    logError('DataSyncService', '源路径或输出路径未设置');
    return;
  }

  // 检查源目录是否存在
  if (!fs.existsSync(sourcePath)) {
    logError('DataSyncService', `源目录不存在: ${sourcePath}`);
    return;
  }

  // 创建输出目录
  if (!fs.existsSync(outputPath)) {
    fs.mkdirSync(outputPath, { recursive: true });
    logInfo('DataSyncService', `创建输出目录: ${outputPath}`);
  }

  // 启动文件监控
  watcher = chokidar.watch(sourcePath, {
    ignored: /(^|[\/\\])\../, // 忽略隐藏文件
    persistent: true,
    ignoreInitial: true,
    awaitWriteFinish: {
      stabilityThreshold: 2000,
      pollInterval: 100
    }
  });

  // 监听文件添加事件
  watcher.on('add', (filePath) => {
    if (path.extname(filePath).toLowerCase() === '.xml') {
      logInfo('DataSyncService', `检测到新文件: ${filePath}`);
      handleNewFile(filePath);
    }
  });

  // 监听文件变更事件
  watcher.on('change', (filePath) => {
    if (path.extname(filePath).toLowerCase() === '.xml') {
      logInfo('DataSyncService', `检测到文件变更: ${filePath}`);
      handleChangedFile(filePath);
    }
  });

  // 启动补件监控
  replacementProcessor.startWatching();

  isWatching = true;
  logSuccess('DataSyncService', '数据同步服务启动成功');
}

/**
 * 停止数据同步服务
 */
function stopWatching() {
  if (watcher) {
    watcher.close();
    watcher = null;
  }
  
  // 停止补件监控
  replacementProcessor.stopWatching();
  
  isWatching = false;
  logInfo('DataSyncService', '数据同步服务已停止');
}

/**
 * 处理新增文件
 * @param {string} filePath - 文件路径
 */
async function handleNewFile(filePath) {
  try {
    // 检查是否为补件目录中的文件
    const relativePath = path.relative(sourcePath, filePath);
    if (relativePath.startsWith('replacement') || relativePath.startsWith('replacement\\') || relativePath.startsWith('replacement/')) {
      logInfo('DataSyncService', `检测到补件目录中的文件: ${filePath}，将由补件处理器处理`);
      return;
    }

    // 处理普通XML文件
    await processXMLFile(filePath, outputPath);
    logSuccess('DataSyncService', `文件处理完成: ${filePath}`);
  } catch (error) {
    logError('DataSyncService', `处理文件失败: ${filePath}, 错误: ${error.message}`);
  }
}

/**
 * 处理变更文件
 * @param {string} filePath - 文件路径
 */
async function handleChangedFile(filePath) {
  try {
    // 检查是否为补件目录中的文件
    const relativePath = path.relative(sourcePath, filePath);
    if (relativePath.startsWith('replacement') || relativePath.startsWith('replacement\\') || relativePath.startsWith('replacement/')) {
      logInfo('DataSyncService', `检测到补件目录中的文件变更: ${filePath}，将由补件处理器处理`);
      return;
    }

    // 处理普通XML文件
    await processXMLFile(filePath, outputPath);
    logSuccess('DataSyncService', `文件变更处理完成: ${filePath}`);
  } catch (error) {
    logError('DataSyncService', `处理文件变更失败: ${filePath}, 错误: ${error.message}`);
  }
}

/**
 * 手动同步指定目录
 * @param {string} srcPath - 源目录路径
 * @param {string} outPath - 输出目录路径
 */
async function syncDirectory(srcPath, outPath) {
  try {
    logInfo('DataSyncService', `开始手动同步目录: ${srcPath} -> ${outPath}`);
    
    // 检查源目录
    if (!fs.existsSync(srcPath)) {
      throw new Error(`源目录不存在: ${srcPath}`);
    }

    // 创建输出目录
    if (!fs.existsSync(outPath)) {
      fs.mkdirSync(outPath, { recursive: true });
    }

    // 读取源目录中的所有XML文件
    const files = fs.readdirSync(srcPath)
      .filter(file => path.extname(file).toLowerCase() === '.xml')
      .map(file => path.join(srcPath, file));

    // 处理每个文件
    for (const file of files) {
      try {
        await processXMLFile(file, outPath);
        logSuccess('DataSyncService', `文件同步完成: ${file}`);
      } catch (error) {
        logError('DataSyncService', `同步文件失败: ${file}, 错误: ${error.message}`);
      }
    }

    logSuccess('DataSyncService', `目录同步完成: ${srcPath} -> ${outPath}`);
  } catch (error) {
    logError('DataSyncService', `目录同步失败: ${error.message}`);
    throw error;
  }
}

/**
 * 网络同步
 * @param {string} networkPath - 网络路径
 * @param {string} localPath - 本地路径
 */
async function networkSync(networkPath, localPath) {
  try {
    logInfo('DataSyncService', `开始网络同步: ${networkPath} -> ${localPath}`);
    await NetworkSync.syncNetworkPath(networkPath, localPath);
    logSuccess('DataSyncService', `网络同步完成: ${networkPath} -> ${localPath}`);
  } catch (error) {
    logError('DataSyncService', `网络同步失败: ${error.message}`);
    throw error;
  }
}

module.exports = {
  initialize,
  startWatching,
  stopWatching,
  syncDirectory,
  networkSync
};