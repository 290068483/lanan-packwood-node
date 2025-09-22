/**
 * 数据库重置和测试数据生成脚本
 * 用于清空现有数据并添加测试数据来覆盖所有状态流程
 */

const fs = require('fs');
const path = require('path');

// 数据库文件路径
const dbPath = path.join(__dirname, 'data', 'database.json');

// 测试客户数据
const testCustomers = [
    {
        name: '测试客户-未打包',
        sourcePath: 'C:\\test\\source\\unpacked',
        outputPath: 'C:\\test\\output\\unpacked',
        status: '未打包',
        packProgress: 0,
        lastUpdate: new Date().toISOString(),
        success: true,
        statusHistory: [
            {
                status: '未打包',
                timestamp: new Date().toISOString(),
                operator: '系统',
                remark: '初始状态'
            }
        ],
        packedParts: 0,
        totalParts: 10,
        packSeqs: [],
        lastPackCheck: new Date().toISOString()
    },
    {
        name: '测试客户-正在处理',
        sourcePath: 'C:\\test\\source\\processing',
        outputPath: 'C:\\test\\output\\processing',
        status: '正在处理',
        packProgress: 50,
        lastUpdate: new Date().toISOString(),
        success: true,
        statusHistory: [
            {
                status: '未打包',
                timestamp: new Date(Date.now() - 3600000).toISOString(),
                operator: '系统',
                remark: '初始状态'
            },
            {
                status: '正在处理',
                previousStatus: '未打包',
                timestamp: new Date(Date.now() - 1800000).toISOString(),
                operator: '系统',
                remark: '开始处理',
                packProgress: 50,
                packedParts: 5,
                totalParts: 10
            }
        ],
        packedParts: 5,
        totalParts: 10,
        packSeqs: ['001'],
        lastPackCheck: new Date().toISOString()
    },
    {
        name: '测试客户-已打包',
        sourcePath: 'C:\\test\\source\\packed',
        outputPath: 'C:\\test\\output\\packed',
        status: '已打包',
        packProgress: 100,
        lastUpdate: new Date().toISOString(),
        success: true,
        statusHistory: [
            {
                status: '未打包',
                timestamp: new Date(Date.now() - 7200000).toISOString(),
                operator: '系统',
                remark: '初始状态'
            },
            {
                status: '正在处理',
                previousStatus: '未打包',
                timestamp: new Date(Date.now() - 5400000).toISOString(),
                operator: '系统',
                remark: '开始处理',
                packProgress: 50,
                packedParts: 5,
                totalParts: 10
            },
            {
                status: '已打包',
                previousStatus: '正在处理',
                timestamp: new Date(Date.now() - 3600000).toISOString(),
                operator: '系统',
                remark: '打包完成',
                packProgress: 100,
                packedParts: 10,
                totalParts: 10
            }
        ],
        packedParts: 10,
        totalParts: 10,
        packSeqs: ['001', '002'],
        lastPackCheck: new Date().toISOString(),
        packDate: new Date(Date.now() - 3600000).toISOString()
    },
    {
        name: '测试客户-已归档',
        sourcePath: 'C:\\test\\source\\archived',
        outputPath: 'C:\\test\\output\\archived',
        status: '已归档',
        packProgress: 100,
        lastUpdate: new Date().toISOString(),
        success: true,
        statusHistory: [
            {
                status: '未打包',
                timestamp: new Date(Date.now() - 10800000).toISOString(),
                operator: '系统',
                remark: '初始状态'
            },
            {
                status: '正在处理',
                previousStatus: '未打包',
                timestamp: new Date(Date.now() - 9000000).toISOString(),
                operator: '系统',
                remark: '开始处理',
                packProgress: 50,
                packedParts: 5,
                totalParts: 10
            },
            {
                status: '已打包',
                previousStatus: '正在处理',
                timestamp: new Date(Date.now() - 7200000).toISOString(),
                operator: '系统',
                remark: '打包完成',
                packProgress: 100,
                packedParts: 10,
                totalParts: 10
            },
            {
                status: '已归档',
                previousStatus: '已打包',
                timestamp: new Date(Date.now() - 3600000).toISOString(),
                operator: '系统',
                remark: '归档完成',
                packProgress: 100,
                packedParts: 10,
                totalParts: 10
            }
        ],
        packedParts: 10,
        totalParts: 10,
        packSeqs: ['001', '002'],
        lastPackCheck: new Date(Date.now() - 7200000).toISOString(),
        packDate: new Date(Date.now() - 7200000).toISOString(),
        archiveDate: new Date(Date.now() - 3600000).toISOString()
    },
    {
        name: '测试客户-全部出货',
        sourcePath: 'C:\\test\\source\\shipped',
        outputPath: 'C:\\test\\output\\shipped',
        status: '全部出货',
        packProgress: 100,
        lastUpdate: new Date().toISOString(),
        success: true,
        statusHistory: [
            {
                status: '未打包',
                timestamp: new Date(Date.now() - 14400000).toISOString(),
                operator: '系统',
                remark: '初始状态'
            },
            {
                status: '正在处理',
                previousStatus: '未打包',
                timestamp: new Date(Date.now() - 12600000).toISOString(),
                operator: '系统',
                remark: '开始处理',
                packProgress: 50,
                packedParts: 5,
                totalParts: 10
            },
            {
                status: '已打包',
                previousStatus: '正在处理',
                timestamp: new Date(Date.now() - 10800000).toISOString(),
                operator: '系统',
                remark: '打包完成',
                packProgress: 100,
                packedParts: 10,
                totalParts: 10
            },
            {
                status: '已归档',
                previousStatus: '已打包',
                timestamp: new Date(Date.now() - 7200000).toISOString(),
                operator: '系统',
                remark: '归档完成',
                packProgress: 100,
                packedParts: 10,
                totalParts: 10
            },
            {
                status: '全部出货',
                previousStatus: '已归档',
                timestamp: new Date(Date.now() - 3600000).toISOString(),
                operator: '系统',
                remark: '全部出货完成',
                packProgress: 100,
                packedParts: 10,
                totalParts: 10
            }
        ],
        packedParts: 10,
        totalParts: 10,
        packSeqs: ['001', '002'],
        lastPackCheck: new Date(Date.now() - 10800000).toISOString(),
        packDate: new Date(Date.now() - 10800000).toISOString(),
        archiveDate: new Date(Date.now() - 7200000).toISOString(),
        shipmentDate: new Date(Date.now() - 3600000).toISOString()
    },
    {
        name: '测试客户-部分出货',
        sourcePath: 'C:\\test\\source\\partial-shipped',
        outputPath: 'C:\\test\\output\\partial-shipped',
        status: '部分出货',
        packProgress: 100,
        lastUpdate: new Date().toISOString(),
        success: true,
        statusHistory: [
            {
                status: '未打包',
                timestamp: new Date(Date.now() - 14400000).toISOString(),
                operator: '系统',
                remark: '初始状态'
            },
            {
                status: '正在处理',
                previousStatus: '未打包',
                timestamp: new Date(Date.now() - 12600000).toISOString(),
                operator: '系统',
                remark: '开始处理',
                packProgress: 50,
                packedParts: 5,
                totalParts: 10
            },
            {
                status: '已打包',
                previousStatus: '正在处理',
                timestamp: new Date(Date.now() - 10800000).toISOString(),
                operator: '系统',
                remark: '打包完成',
                packProgress: 100,
                packedParts: 10,
                totalParts: 10
            },
            {
                status: '已归档',
                previousStatus: '已打包',
                timestamp: new Date(Date.now() - 7200000).toISOString(),
                operator: '系统',
                remark: '归档完成',
                packProgress: 100,
                packedParts: 10,
                totalParts: 10
            },
            {
                status: '部分出货',
                previousStatus: '已归档',
                timestamp: new Date(Date.now() - 3600000).toISOString(),
                operator: '系统',
                remark: '部分出货完成',
                packProgress: 100,
                packedParts: 10,
                totalParts: 10
            }
        ],
        packedParts: 10,
        totalParts: 10,
        packSeqs: ['001', '002'],
        lastPackCheck: new Date(Date.now() - 10800000).toISOString(),
        packDate: new Date(Date.now() - 10800000).toISOString(),
        archiveDate: new Date(Date.now() - 7200000).toISOString(),
        shipmentDate: new Date(Date.now() - 3600000).toISOString()
    },
    {
        name: '测试客户-未出货',
        sourcePath: 'C:\\test\\source\\not-shipped',
        outputPath: 'C:\\test\\output\\not-shipped',
        status: '未出货',
        packProgress: 100,
        lastUpdate: new Date().toISOString(),
        success: true,
        statusHistory: [
            {
                status: '未打包',
                timestamp: new Date(Date.now() - 14400000).toISOString(),
                operator: '系统',
                remark: '初始状态'
            },
            {
                status: '正在处理',
                previousStatus: '未打包',
                timestamp: new Date(Date.now() - 12600000).toISOString(),
                operator: '系统',
                remark: '开始处理',
                packProgress: 50,
                packedParts: 5,
                totalParts: 10
            },
            {
                status: '已打包',
                previousStatus: '正在处理',
                timestamp: new Date(Date.now() - 10800000).toISOString(),
                operator: '系统',
                remark: '打包完成',
                packProgress: 100,
                packedParts: 10,
                totalParts: 10
            },
            {
                status: '已归档',
                previousStatus: '已打包',
                timestamp: new Date(Date.now() - 7200000).toISOString(),
                operator: '系统',
                remark: '归档完成',
                packProgress: 100,
                packedParts: 10,
                totalParts: 10
            },
            {
                status: '未出货',
                previousStatus: '已归档',
                timestamp: new Date(Date.now() - 3600000).toISOString(),
                operator: '系统',
                remark: '标记为未出货',
                packProgress: 100,
                packedParts: 10,
                totalParts: 10
            }
        ],
        packedParts: 10,
        totalParts: 10,
        packSeqs: ['001', '002'],
        lastPackCheck: new Date(Date.now() - 10800000).toISOString(),
        packDate: new Date(Date.now() - 10800000).toISOString(),
        archiveDate: new Date(Date.now() - 7200000).toISOString()
    }
];

// 创建新的数据库数据
const newDatabase = {
    customers: testCustomers,
    lastUpdate: new Date().toISOString(),
    version: '1.0'
};

// 备份现有数据库
function backupDatabase() {
    if (fs.existsSync(dbPath)) {
        const backupPath = path.join(__dirname, 'data', `database.backup.${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
        fs.copyFileSync(dbPath, backupPath);
        console.log(`数据库已备份到: ${backupPath}`);
    }
}

// 重置数据库
function resetDatabase() {
    try {
        // 备份现有数据库
        backupDatabase();

        // 写入新的测试数据
        fs.writeFileSync(dbPath, JSON.stringify(newDatabase, null, 2), 'utf8');

        console.log('数据库重置成功！');
        console.log('已添加以下测试客户：');
        testCustomers.forEach(customer => {
            console.log(`- ${customer.name} (${customer.status})`);
        });

        console.log('\n状态流程覆盖：');
        console.log('1. 未打包 → 正在处理 → 已打包 → 已归档 → 全部出货');
        console.log('2. 未打包 → 正在处理 → 已打包 → 已归档 → 部分出货');
        console.log('3. 未打包 → 正在处理 → 已打包 → 已归档 → 未出货');

    } catch (error) {
        console.error('数据库重置失败:', error);
        process.exit(1);
    }
}

// 执行重置
resetDatabase();

console.log('\n测试数据生成完成！');
console.log('现在可以启动应用程序来测试所有状态流程。');