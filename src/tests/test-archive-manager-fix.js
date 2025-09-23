/**
 * 测试客户归档管理器
 * 验证修复后的getCustomerByName方法调用
 */

const path = require('path');
const fs = require('fs').promises;
const CustomerArchiveManager = require('../utils/customer-archive-manager');
const { CustomerFS } = require('../database/models/customer-fs');
const customerStatusManager = require('../utils/customer-status-manager');

// 将在测试中创建customerFS实例

// 测试数据路径
const testCustomerDataPath = path.join(__dirname, '../../../data-test/database.json');
const testPanelDataPath = path.join(__dirname, '../../../data-test/panels.json');

async function testArchiveManager() {
    console.log('开始测试客户归档管理器...');

    try {
        // 创建测试客户数据
        const testCustomer = {
            id: 'test-customer-001',
            name: '测试归档客户',
            address: '测试地址',
            status: customerStatusManager.STATUS.PACKED,
            shipmentStatus: customerStatusManager.SHIPMENT_STATUS.NOT_SHIPPED,
            packedParts: 10,
            totalParts: 10,
            packProgress: 100,
            packSeqs: ['PKG001'],
            outputPath: path.join(__dirname, '../../../data-test/customers/测试归档客户'),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        // 确保测试目录存在
        await fs.mkdir(path.dirname(testCustomerDataPath), { recursive: true });
        await fs.mkdir(testCustomer.outputPath, { recursive: true });

        // 创建测试客户数据文件
        const existingData = {
            customers: [testCustomer],
            lastUpdate: new Date().toISOString()
        };
        await fs.writeFile(testCustomerDataPath, JSON.stringify(existingData, null, 2));

        // 创建测试面板数据文件
        const panelData = [
            {
                panelId: 'panel-001',
                customerId: 'test-customer-001',
                name: '测试面板',
                width: 100,
                height: 200,
                thickness: 18,
                material: 'MDF',
                edgeBand: 'PVC',
                edgeBandWidth: 2,
                edgeBandColor: '白色',
                isPacked: 1
            }
        ];
        await fs.writeFile(testPanelDataPath, JSON.stringify(panelData, null, 2));

        // 创建packages.json文件
        const packagesData = [
            {
                packSeq: 'PKG001',
                packageInfo: {
                    weight: 5.5
                },
                partIDs: ['part-001', 'part-002']
            }
        ];
        await fs.writeFile(
            path.join(testCustomer.outputPath, 'packages.json'),
            JSON.stringify(packagesData, null, 2)
        );

        console.log('测试数据创建完成');

        // 设置customerFS使用测试数据路径
        const testBasePath = path.join(__dirname, '../../../data-test');
        CustomerFS.setDataPath(testBasePath);

        // 创建新的customerFS实例
        const customerFS = new CustomerFS();

        // 测试getCustomerByName方法
        console.log('测试getCustomerByName方法...');
        const customer = customerFS.getCustomerByName('测试归档客户');
        if (!customer) {
            throw new Error('getCustomerByName方法返回null');
        }
        console.log('✓ getCustomerByName方法调用成功');
        console.log('客户信息:', customer.name, customer.status);

        // 测试归档功能
        console.log('测试客户归档功能...');
        const archiveResult = await CustomerArchiveManager.archiveCustomer(
            '测试归档客户',
            '测试用户',
            '测试归档'
        );

        if (archiveResult.success) {
            console.log('✓ 客户归档成功');
            console.log('归档ID:', archiveResult.archiveId);
        } else {
            console.error('✗ 客户归档失败:', archiveResult.message);
            throw new Error(archiveResult.message);
        }

        console.log('\n🎉 所有测试通过！归档功能修复成功！');

    } catch (error) {
        console.error('测试失败:', error.message);
        console.error('错误堆栈:', error.stack);
        throw error;
    }
}

// 运行测试
if (require.main === module) {
    testArchiveManager()
        .then(() => {
            console.log('\n测试完成');
            process.exit(0);
        })
        .catch((error) => {
            console.error('\n测试执行失败:', error.message);
            process.exit(1);
        });
}

module.exports = { testArchiveManager };