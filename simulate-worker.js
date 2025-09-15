const fs = require('fs');
const path = require('path');

// 创建测试目录结构
const workerDir = './fomat-xml';
const packagesPath = path.join(workerDir, 'packages.json');

// 确保目录存在
if (!fs.existsSync(workerDir)) {
  fs.mkdirSync(workerDir, { recursive: true });
}

// 初始化打包数据
let packages = [];

// 如果文件已存在，读取现有数据
if (fs.existsSync(packagesPath)) {
  try {
    const data = fs.readFileSync(packagesPath, 'utf8');
    packages = JSON.parse(data);
  } catch (error) {
    console.log('读取现有packages.json文件时出错:', error.message);
  }
}

console.log(`开始模拟工人打包数据，当前已有 ${packages.length} 条记录`);
console.log('每5秒添加一条新的打包记录...');

// 模拟打包数据生成函数
function generatePackageData() {
  const timestamp = new Date().toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).replace(/\//g, '-');

  // 生成随机的部件ID
  const partIDs = [];
  const partCount = Math.floor(Math.random() * 5) + 3; // 3-7个部件
  for (let i = 0; i < partCount; i++) {
    // 生成32位随机字符串模拟部件ID
    let id = '';
    const characters = '0123456789abcdef';
    for (let j = 0; j < 32; j++) {
      id += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    partIDs.push(id);
  }

  const packData = {
    "deliveryID": "",
    "diyPackType": "",
    "isDelete": false,
    "operateUserCode": "",
    "operateUserName": "",
    "packConfirm": Math.floor(Math.random() * 10000000),
    "packDate": timestamp,
    "packID": generateRandomId(),
    "packNo": generateRandomNumberString(12),
    "packQty": partIDs.length,
    "packSeq": packages.length + 1,
    "packState": 1,
    "packType": 0,
    "packUserCode": "打包员" + (Math.floor(Math.random() * 5) + 1),
    "packUserName": "打包员" + (Math.floor(Math.random() * 5) + 1),
    "partIDs": partIDs,
    "partItems": [],
    "storeArea": "",
    "storeDate": "",
    "storeUserCode": "",
    "storeUserName": ""
  };

  return packData;
}

// 生成随机ID
function generateRandomId() {
  let id = '';
  const characters = '0123456789abcdef';
  for (let i = 0; i < 32; i++) {
    id += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return id;
}

// 生成指定长度的数字字符串
function generateRandomNumberString(length) {
  let result = '';
  for (let i = 0; i < length; i++) {
    result += Math.floor(Math.random() * 10);
  }
  return result;
}

// 定时添加新的打包数据
setInterval(() => {
  const newPackage = generatePackageData();
  packages.push(newPackage);
  
  // 保存到文件
  try {
    fs.writeFileSync(packagesPath, JSON.stringify(packages, null, 2), 'utf8');
    console.log(`[${new Date().toLocaleTimeString()}] 添加新的打包记录，当前共 ${packages.length} 条记录`);
  } catch (error) {
    console.error('保存packages.json时出错:', error.message);
  }
}, 5000); // 每5秒执行一次

// 处理退出信号
process.on('SIGINT', () => {
  console.log('\n正在退出模拟程序...');
  try {
    fs.writeFileSync(packagesPath, JSON.stringify(packages, null, 2), 'utf8');
    console.log('数据已保存到packages.json');
  } catch (error) {
    console.error('保存数据时出错:', error.message);
  }
  process.exit(0);
});