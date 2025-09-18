/**
 * 数据同步服务
 * 定期从源路径提取数据并更新数据库
 */

const fs = require('fs');
const path = require('path');
const { EventEmitter } = require('events');
const crypto = require('crypto');
const { extractAllCustomersData } = require('./xml-extractor');
const { getAllCustomers, getCustomersByStatus } = require('../database/models/customer');

/**
 * 数据同步服务类
 */
class DataSyncService extends EventEmitter {
  constructor(config) {
    super();
    this.config = config;
    this.isRunning = false;
    this.syncInterval = null;
    this.lastSyncTime = null;
    this.watcher = null;
  }

  /**
   * 启动数据同步服务
   */
  start() {
    if (this.isRunning) {
      console.log('数据同步服务已在运行');
      return;
    }

    this.isRunning = true;
    console.log('启动数据同步服务...');

    // 立即执行一次同步
    this.syncData();

    // 设置定时同步
    const syncIntervalMs = (this.config.syncInterval || 60) * 60 * 1000; // 默认60分钟
    this.syncInterval = setInterval(() => {
      this.syncData();
    }, syncIntervalMs);

    // 暂时禁用文件监控，避免crypto问题
    // if (this.config.enableFileWatch) {
    //   this.startFileWatch();
    // }

    console.log(`数据同步服务已启动，同步间隔: ${syncIntervalMs / 60000} 分钟`);
  }

  /**
   * 停止数据同步服务
   */
  stop() {
    if (!this.isRunning) {
      console.log('数据同步服务未运行');
      return;
    }

    this.isRunning = false;
    console.log('停止数据同步服务...');

    // 清除定时器
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }

    // 停止文件监控
    if (this.watcher) {
      this.watcher.close();
      this.watcher = null;
    }

    console.log('数据同步服务已停止');
  }

  /**
   * 执行数据同步
   */
  async syncData() {
    try {
      console.log('开始数据同步...');

      // 检查源路径是否存在
      if (!fs.existsSync(this.config.sourcePath) || !fs.statSync(this.config.sourcePath).isDirectory()) {
        throw new Error('源路径不存在');
      }

      // 提取所有客户数据
      const customers = await extractAllCustomersData(this.config.sourcePath);

      // 更新最后同步时间
      this.lastSyncTime = new Date();

      // 发送同步完成事件
      this.emit('syncCompleted', {
        timestamp: this.lastSyncTime,
        customersCount: customers.length
      });

      console.log(`数据同步完成，处理了 ${customers.length} 个客户`);
    } catch (error) {
      console.error('数据同步出错:', error);
      this.emit('syncError', error);
    }
  }

  /**
   * 启动文件监控
   */
  startFileWatch() {
    try {
      const chokidar = require('chokidar');
      const watcher = chokidar.watch(this.config.sourcePath, {
        ignored: /(^|[\/\\])\../, // 忽略点文件
        persistent: true
      });

      watcher.on('ready', () => {
        console.log('文件监控已启动');
      });

      watcher.on('change', (filePath) => {
        console.log(`检测到文件变化: ${filePath}`);
        this.syncData();
      });

      watcher.on('add', (filePath) => {
        console.log(`检测到新文件: ${filePath}`);
        this.syncData();
      });

      watcher.on('unlink', (filePath) => {
        console.log(`检测到文件删除: ${filePath}`);
        this.syncData();
      });

      this.watcher = watcher;
    } catch (error) {
      console.error('启动文件监控出错:', error);
    }
  }

  /**
   * 获取同步状态
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      lastSyncTime: this.lastSyncTime,
      config: this.config
    };
  }
}

/**
 * 创建数据同步服务实例
 * @param {Object} config - 配置对象
 * @returns {DataSyncService} 数据同步服务实例
 */
function createDataSyncService(config) {
  return new DataSyncService(config);
}

module.exports = {
  DataSyncService,
  createDataSyncService
};
