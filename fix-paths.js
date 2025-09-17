const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

console.log('=== 客户数据路径修复工具 ===');

// 需要检查和创建的目录
const directories = [
  'D:/backup_data/backup/customer',
  'D:/backup_data/backup/worker'
];

// 检查并创建目录
directories.forEach(dir => {
  try {
    if (!fs.existsSync(dir)) {
      console.log(`目录不存在: ${dir}`);

      // 尝试创建目录
      fs.mkdirSync(dir, { recursive: true });
      console.log(`✅ 已创建目录: ${dir}`);
    } else {
      console.log(`✅ 目录已存在: ${dir}`);
    }
  } catch (error) {
    console.error(`❌ 创建目录失败: ${dir}`, error.message);
  }
});

// 尝试打开目录
console.log('\n尝试打开目录...');
directories.forEach(dir => {
  try {
    if (fs.existsSync(dir)) {
      console.log(`尝试打开: ${dir}`);
      exec(`start "" "${dir}"`, (error) => {
        if (error) {
          console.error(`❌ 打开目录失败: ${dir}`, error.message);
        } else {
          console.log(`✅ 已成功打开目录: ${dir}`);
        }
      });
    } else {
      console.warn(`⚠️ 目录不存在，无法打开: ${dir}`);
    }
  } catch (error) {
    console.error(`❌ 处理目录时出错: ${dir}`, error.message);
  }
});

console.log('\n修复工具执行完成。');
