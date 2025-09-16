const DataManager = require('./data-manager');
const cron = require('node-cron');

// 检查node-cron是否已安装，如果没有则提示安装
let cronAvailable = true;
try {
  require.resolve('node-cron');
} catch (e) {
  cronAvailable = false;
  console.warn('警告: node-cron未安装，定时清理功能将不可用。如需使用，请运行: npm install node-cron');
}

class CleanupTask {
  // 启动定时清理任务（每天凌晨2点执行）
  static start() {
    if (!cronAvailable) {
      console.log('定时清理任务未启动：缺少node-cron依赖');
      return;
    }
    
    // 每天凌晨2点执行清理任务
    cron.schedule('0 2 * * *', () => {
      console.log('执行定时数据清理任务');
      DataManager.cleanupOldData(30); // 保留30天数据
    });
    
    console.log('✓ 定时清理任务已启动（每天凌晨2点执行）');
  }
}

module.exports = CleanupTask;