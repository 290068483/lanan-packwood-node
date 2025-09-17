const fs = require('fs');
const path = require('path');

// 需要创建的目录列表
const directories = [
  'D:/backup_data/backup/customer',
  'D:/backup_data/backup/worker'
];

console.log('检查并创建必要的目录...');

directories.forEach(dir => {
  try {
    // 检查目录是否存在
    if (!fs.existsSync(dir)) {
      // 创建目录（包括所有必要的父目录）
      fs.mkdirSync(dir, { recursive: true });
      console.log(`✅ 已创建目录: ${dir}`);
    } else {
      console.log(`✅ 目录已存在: ${dir}`);
    }
  } catch (error) {
    console.error(`❌ 创建目录失败: ${dir}`, error.message);
  }
});

console.log('\n目录检查和创建完成。');
