const CustomerArchiveManager = require('../src/utils/customer-archive-manager');
const customerFs = require('../src/database/models/customer-fs');
const fs = require('fs').promises;
const path = require('path');

async function test() {
  try {
    console.log('开始测试归档功能...');

    // 创建测试客户
    const testOutputPath = path.join(__dirname, 'test-output');
    const testCustomer = {
      name: '测试客户',
      status: '已打包',
      outputPath: testOutputPath
    };

    // 创建客户数据
    console.log('创建测试客户...');
    await customerFs.createOrUpdateCustomer(testCustomer);

    // 创建测试输出目录
    await fs.mkdir(testOutputPath, { recursive: true });

    // 创建测试 packages.json 文件
    const testPackages = [
      {
        packSeq: '001',
        packageInfo: { quantity: 5 },
        partIDs: ['part1', 'part2', 'part3']
      }
    ];

    await fs.writeFile(
      path.join(testOutputPath, 'packages.json'),
      JSON.stringify(testPackages, null, 2)
    );

    console.log('创建测试数据完成');

    // 测试归档功能
    console.log('开始归档测试客户...');
    const result = await CustomerArchiveManager.archiveCustomer(
      '测试客户',
      '测试操作员',
      '测试备注'
    );

    console.log('归档结果:', result);

    // 清理测试数据
    await fs.rm(testOutputPath, { recursive: true, force: true });
    console.log('测试数据清理完成');

  } catch (error) {
    console.error('测试过程中出错:', error);
  }
}

test();