const customerFs = require('../src/database/models/customer-fs');
const path = require('path');

async function test() {
  try {
    console.log('开始测试客户数据功能...');

    // 创建测试客户
    const testCustomer = {
      name: '测试客户',
      status: '已打包',
      outputPath: path.join(__dirname, 'test-output')
    };

    console.log('创建测试客户...');
    const customer = await customerFs.createOrUpdateCustomer(testCustomer);
    console.log('创建客户成功:', customer);

    // 查询客户
    console.log('查询客户...');
    const foundCustomer = await customerFs.getCustomerByName('测试客户');
    console.log('查询客户结果:', foundCustomer);

    // 查询不存在的客户
    console.log('查询不存在的客户...');
    const notFoundCustomer = await customerFs.getCustomerByName('不存在的客户');
    console.log('查询不存在的客户结果:', notFoundCustomer);

  } catch (error) {
    console.error('测试过程中出错:', error);
  }
}

test();