const fs = require('fs');
const path = require('path');
const customerStatusManager = require('../utils/customer-status-manager');
const PackageDataExtractor = require('../utils/package-data-extractor');

/**
 * 客户状态管理测试
 */
async function testCustomerStatusManager() {
  console.log('开始测试客户状态管理功能...
');

  // 1. 准备测试数据
  const testDataDir = path.join(__dirname, '../test-data');
  if (!fs.existsSync(testDataDir)) {
    fs.mkdirSync(testDataDir, { recursive: true });
  }

  // 创建模拟的packages.json文件
  const packagesPath = path.join(testDataDir, 'packages.json');
  const mockPackagesData = [
    {
      "packSeq": "1",
      "packNo": "1110953111252",
      "packDate": "2023-01-01 10:52:30",
      "partIDs": [
        "58b2e383702249219bc6744e0419a9e6",
        "02e74f241107448d84947c22e43db18d"
      ]
    },
    {
      "packSeq": "2",
      "packNo": "1110953111253",
      "packDate": "2023-01-01 11:00:00",
      "partIDs": [
        "92b0350c40034acea092f1f99dcd1ea4",
        "d3ad19afc3d14a8b950021003c89b68c"
      ]
    }
  ];

  fs.writeFileSync(packagesPath, JSON.stringify(mockPackagesData, null, 2));

  // 创建模拟的客户数据
  const mockCustomerData = {
    name: '测试客户',
    panels: [
      { id: '58b2e383702249219bc6744e0419a9e6', name: '板件1' },
      { id: '02e74f241107448d84947c22e43db18d', name: '板件2' },
      { id: '92b0350c40034acea092f1f99dcd1ea4', name: '板件3' },
      { id: 'd3ad19afc3d14a8b950021003c89b68c', name: '板件4' },
      { id: '1234567890abcdef1234567890abcdef', name: '板件5' } // 这个板件不在packages.json中
    ],
    status: '未打包',
    totalParts: 5,
    packedParts: 0,
    packSeqs: []
  };

  // 2. 测试检查打包状态功能
  console.log('1. 测试检查打包状态功能...');
  const packagesData = PackageDataExtractor.extractCustomerPackageData(packagesPath);
  const statusInfo = customerStatusManager.checkPackStatus(mockCustomerData, packagesData);

  console.log(`状态: ${statusInfo.status}`);
  console.log(`已打包板件数: ${statusInfo.packedCount}/${statusInfo.totalParts}`);
  console.log(`打包进度: ${statusInfo.packProgress}%`);
  console.log(`包号: ${statusInfo.packSeqs.join(', ')}`);

  // 3. 测试更新客户状态功能
  console.log('
2. 测试更新客户状态功能...');
  const updatedData = customerStatusManager.updateCustomerStatus(
    mockCustomerData, 
    statusInfo, 
    '测试用户', 
    '测试状态更新'
  );

  console.log(`更新后状态: ${updatedData.status}`);
  console.log(`状态历史记录数: ${updatedData.statusHistory.length}`);
  console.log(`最后状态更新时间: ${updatedData.lastStatusUpdate}`);

  // 4. 测试归档功能
  console.log('
3. 测试归档功能...');
  try {
    const archivedData = customerStatusManager.archiveCustomer(
      updatedData, 
      '测试用户', 
      '测试归档'
    );
    console.log(`归档后状态: ${archivedData.status}`);
    console.log(`归档时间: ${archivedData.archiveDate}`);
  } catch (error) {
    console.log(`归档失败: ${error.message}`);
  }

  // 5. 测试出货功能
  console.log('
4. 测试出货功能...');
  try {
    const shippedData = customerStatusManager.shipCustomer(
      { ...updatedData, status: customerStatusManager.STATUS.ARCHIVED }, 
      '测试用户', 
      '测试出货'
    );
    console.log(`出货后状态: ${shippedData.status}`);
    console.log(`出货时间: ${shippedData.shipmentDate}`);
  } catch (error) {
    console.log(`出货失败: ${error.message}`);
  }

  // 6. 测试标记为未出货功能
  console.log('
5. 测试标记为未出货功能...');
  try {
    const notShippedData = customerStatusManager.markCustomerNotShipped(
      { ...updatedData, status: customerStatusManager.STATUS.ARCHIVED }, 
      '测试用户', 
      '测试标记为未出货'
    );
    console.log(`标记后状态: ${notShippedData.status}`);
  } catch (error) {
    console.log(`标记失败: ${error.message}`);
  }

  // 7. 测试状态颜色功能
  console.log('
6. 测试状态颜色功能...');
  const colors = Object.keys(customerStatusManager.STATUS).map(status => {
    return {
      status,
      color: customerStatusManager.getStatusColor(status)
    };
  });

  colors.forEach(item => {
    console.log(`${item.status}: ${item.color}`);
  });

  // 清理测试数据
  fs.unlinkSync(packagesPath);
  fs.rmdirSync(testDataDir);

  console.log('
客户状态管理测试完成！');
}

// 运行测试
if (require.main === module) {
  testCustomerStatusManager().catch(error => {
    console.error('测试失败:', error);
    process.exit(1);
  });
}

module.exports = {
  testCustomerStatusManager
};
