/**
 * 测试数据同步服务
 */

const { extractCustomerData, extractAllCustomersData } = require('./src/services/xml-extractor');
const { createOrUpdateCustomer } = require('./src/database/models/customer');
const path = require('path');
const fs = require('fs');

// 测试数据路径
const testSourcePath = '//A6/蓝岸文件/1、客户总文件/3、生产/1、正单';

// 检查源路径是否存在
if (!fs.existsSync(testSourcePath) || !fs.statSync(testSourcePath).isDirectory()) {
  console.error('源路径不存在:', testSourcePath);
  process.exit(1);
}

console.log('开始测试数据同步服务...');

// 测试提取单个客户数据
async function testExtractCustomerData() {
  try {
    // 获取第一个客户目录
    const customerDirs = fs.readdirSync(testSourcePath)
      .filter(dir => {
        const fullPath = path.join(testSourcePath, dir);
        return fs.statSync(fullPath).isDirectory();
      });

    if (customerDirs.length === 0) {
      console.log('没有找到客户目录');
      return;
    }

    const firstCustomerDir = customerDirs[0];
    const customerDirPath = path.join(testSourcePath, firstCustomerDir);
    console.log(`测试提取客户数据: ${firstCustomerDir}`);

    const customerData = await extractCustomerData(customerDirPath);
    console.log('客户数据提取成功:', JSON.stringify(customerData, null, 2));

    // 测试保存到数据库
    await createOrUpdateCustomer(customerData);
    console.log('客户数据保存到数据库成功');
  } catch (error) {
    console.error('测试提取客户数据失败:', error);
  }
}

// 测试提取所有客户数据
async function testExtractAllCustomersData() {
  try {
    console.log('测试提取所有客户数据...');
    const customers = await extractAllCustomersData(testSourcePath);
    console.log(`成功提取 ${customers.length} 个客户数据`);

    // 测试保存到数据库
    for (const customer of customers) {
      await createOrUpdateCustomer(customer);
    }
    console.log('所有客户数据保存到数据库成功');
  } catch (error) {
    console.error('测试提取所有客户数据失败:', error);
  }
}

// 运行测试
(async () => {
  await testExtractCustomerData();
  console.log('----------------------------------------');
  await testExtractAllCustomersData();
  console.log('测试完成');
})();
