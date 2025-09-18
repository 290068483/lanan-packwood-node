const fs = require('fs');
const path = require('path');
const CustomerPackageUtils = require('./src/utils/customer-package-utils');

// 测试数据库保存功能
async function testDatabaseSave() {
    try {
        console.log('测试数据库保存功能...');

        // 创建一个测试的packages.json文件
        const testPackagesPath = path.join(__dirname, 'test-packages.json');
        const testData = [
            {
                packDate: '2025-01-15',
                packID: 'TEST001',
                packQty: 10,
                packUserName: '测试工人',
                packState: 1,
                partIDs: ['PART001', 'PART002', 'PART003'],
                isReplacement: true,
                replacementStatus: '未出货补件'
            }
        ];

        fs.writeFileSync(testPackagesPath, JSON.stringify(testData, null, 2));
        console.log('创建测试文件:', testPackagesPath);

        // 测试保存到数据库
        const result = await CustomerPackageUtils.saveCustomerPackageDataToDB(testPackagesPath);
        console.log('保存结果:', result);

        // 清理测试文件
        fs.unlinkSync(testPackagesPath);
        console.log('清理测试文件');

        if (result) {
            console.log('✅ 数据库保存功能测试成功');
        } else {
            console.log('❌ 数据库保存功能测试失败');
        }

    } catch (error) {
        console.error('测试过程中出错:', error);
    }
}

// 运行测试
testDatabaseSave();