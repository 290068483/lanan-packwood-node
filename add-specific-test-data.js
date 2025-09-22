/**
 * 添加特定功能测试数据
 * 用于测试归档、出货、补件等具体功能场景
 */

const fs = require('fs');
const path = require('path');

// 数据库文件路径
const dbPath = path.join(__dirname, 'data', 'database.json');

// 备份当前数据库
const backupPath = path.join(__dirname, 'data', `database.backup.${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
fs.copyFileSync(dbPath, backupPath);
console.log(`数据库已备份到: ${backupPath}`);

// 读取当前数据库
const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));

// 添加特定功能测试客户
const testCustomers = [
    // 需要补件的客户 - 部分出货后需要补件
    {
        name: "测试客户-需要补件",
        sourcePath: "C:\\test\\source\\need-replenishment",
        outputPath: "C:\\test\\output\\need-replenishment",
        status: "部分出货",
        packProgress: 100,
        lastUpdate: new Date().toISOString(),
        success: true,
        statusHistory: [
            {
                status: "未打包",
                timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
                operator: "系统",
                remark: "初始状态"
            },
            {
                status: "正在处理",
                previousStatus: "未打包",
                timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
                operator: "系统",
                remark: "开始处理",
                packProgress: 50,
                packedParts: 8,
                totalParts: 15
            },
            {
                status: "已打包",
                previousStatus: "正在处理",
                timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
                operator: "系统",
                remark: "打包完成",
                packProgress: 100,
                packedParts: 15,
                totalParts: 15
            },
            {
                status: "已归档",
                previousStatus: "已打包",
                timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
                operator: "系统",
                remark: "归档完成",
                packProgress: 100,
                packedParts: 15,
                totalParts: 15
            },
            {
                status: "部分出货",
                previousStatus: "已归档",
                timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
                operator: "系统",
                remark: "部分出货（10件），剩余5件需要补件",
                packProgress: 100,
                packedParts: 15,
                totalParts: 15,
                shippedParts: 10,
                remainingParts: 5
            }
        ],
        packedParts: 15,
        totalParts: 15,
        packSeqs: ["001", "002", "003"],
        lastPackCheck: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        packDate: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        archiveDate: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
        shipmentDate: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
        shippedParts: 10,
        remainingParts: 5,
        replenishmentNeeded: true,
        replenishmentReason: "客户要求追加5件产品"
    },

    // 多次归档恢复的客户
    {
        name: "测试客户-多次归档恢复",
        sourcePath: "C:\\test\\source\\multi-archive",
        outputPath: "C:\\test\\output\\multi-archive",
        status: "已归档",
        packProgress: 100,
        lastUpdate: new Date().toISOString(),
        success: true,
        statusHistory: [
            {
                status: "未打包",
                timestamp: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
                operator: "系统",
                remark: "初始状态"
            },
            {
                status: "正在处理",
                previousStatus: "未打包",
                timestamp: new Date(Date.now() - 7 * 60 * 60 * 1000).toISOString(),
                operator: "系统",
                remark: "开始处理"
            },
            {
                status: "已打包",
                previousStatus: "正在处理",
                timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
                operator: "系统",
                remark: "打包完成"
            },
            {
                status: "已归档",
                previousStatus: "已打包",
                timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
                operator: "系统",
                remark: "第一次归档"
            },
            {
                status: "已打包",
                previousStatus: "已归档",
                timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
                operator: "系统",
                remark: "恢复归档"
            },
            {
                status: "已归档",
                previousStatus: "已打包",
                timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
                operator: "系统",
                remark: "第二次归档"
            },
            {
                status: "已打包",
                previousStatus: "已归档",
                timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
                operator: "系统",
                remark: "再次恢复归档"
            },
            {
                status: "已归档",
                previousStatus: "已打包",
                timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
                operator: "系统",
                remark: "第三次归档"
            }
        ],
        packedParts: 20,
        totalParts: 20,
        packSeqs: ["001", "002", "003", "004"],
        lastPackCheck: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
        packDate: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
        archiveDate: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
        archiveCount: 3,
        restoreCount: 2
    },

    // 出货状态变更测试客户
    {
        name: "测试客户-出货状态变更",
        sourcePath: "C:\\test\\source\\ship-status-change",
        outputPath: "C:\\test\\output\\ship-status-change",
        status: "未出货",
        packProgress: 100,
        lastUpdate: new Date().toISOString(),
        success: true,
        statusHistory: [
            {
                status: "未打包",
                timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
                operator: "系统",
                remark: "初始状态"
            },
            {
                status: "正在处理",
                previousStatus: "未打包",
                timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
                operator: "系统",
                remark: "开始处理"
            },
            {
                status: "已打包",
                previousStatus: "正在处理",
                timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
                operator: "系统",
                remark: "打包完成"
            },
            {
                status: "已归档",
                previousStatus: "已打包",
                timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
                operator: "系统",
                remark: "归档完成"
            },
            {
                status: "全部出货",
                previousStatus: "已归档",
                timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
                operator: "系统",
                remark: "全部出货"
            },
            {
                status: "未出货",
                previousStatus: "全部出货",
                timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
                operator: "系统",
                remark: "客户要求取消出货，标记为未出货"
            }
        ],
        packedParts: 12,
        totalParts: 12,
        packSeqs: ["001", "002"],
        lastPackCheck: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
        packDate: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
        archiveDate: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
        shipmentDate: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        shipmentCancelled: true,
        cancellationReason: "客户要求取消出货"
    },

    // 大批量客户测试
    {
        name: "测试客户-大批量",
        sourcePath: "C:\\test\\source\\large-batch",
        outputPath: "C:\\test\\output\\large-batch",
        status: "正在处理",
        packProgress: 25,
        lastUpdate: new Date().toISOString(),
        success: true,
        statusHistory: [
            {
                status: "未打包",
                timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
                operator: "系统",
                remark: "初始状态 - 大批量订单"
            },
            {
                status: "正在处理",
                previousStatus: "未打包",
                timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
                operator: "系统",
                remark: "开始处理大批量订单",
                packProgress: 25,
                packedParts: 50,
                totalParts: 200
            }
        ],
        packedParts: 50,
        totalParts: 200,
        packSeqs: ["001"],
        lastPackCheck: new Date().toISOString(),
        isLargeBatch: true,
        batchPriority: "high",
        estimatedCompletionTime: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString()
    },

    // 补件完成客户
    {
        name: "测试客户-补件完成",
        sourcePath: "C:\\test\\source\\replenishment-completed",
        outputPath: "C:\\test\\output\\replenishment-completed",
        status: "全部出货",
        packProgress: 100,
        lastUpdate: new Date().toISOString(),
        success: true,
        statusHistory: [
            {
                status: "未打包",
                timestamp: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
                operator: "系统",
                remark: "初始状态"
            },
            {
                status: "正在处理",
                previousStatus: "未打包",
                timestamp: new Date(Date.now() - 7 * 60 * 60 * 1000).toISOString(),
                operator: "系统",
                remark: "开始处理"
            },
            {
                status: "已打包",
                previousStatus: "正在处理",
                timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
                operator: "系统",
                remark: "打包完成"
            },
            {
                status: "已归档",
                previousStatus: "已打包",
                timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
                operator: "系统",
                remark: "归档完成"
            },
            {
                status: "部分出货",
                previousStatus: "已归档",
                timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
                operator: "系统",
                remark: "部分出货8件，剩余2件需要补件",
                shippedParts: 8,
                remainingParts: 2
            },
            {
                status: "已打包",
                previousStatus: "部分出货",
                timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
                operator: "系统",
                remark: "补件处理开始"
            },
            {
                status: "已归档",
                previousStatus: "已打包",
                timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
                operator: "系统",
                remark: "补件完成并重新归档"
            },
            {
                status: "全部出货",
                previousStatus: "已归档",
                timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
                operator: "系统",
                remark: "补件后全部出货完成"
            }
        ],
        packedParts: 10,
        totalParts: 10,
        packSeqs: ["001", "002"],
        lastPackCheck: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
        packDate: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
        archiveDate: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        shipmentDate: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
        replenishmentCompleted: true,
        originalShippedParts: 8,
        replenishedParts: 2
    }
];

// 添加新客户到数据库
db.customers.push(...testCustomers);
db.lastUpdate = new Date().toISOString();

// 保存更新后的数据库
fs.writeFileSync(dbPath, JSON.stringify(db, null, 2), 'utf8');

console.log("\n=== 特定功能测试数据添加完成 ===");
console.log("\n新增测试客户：");
testCustomers.forEach(customer => {
    console.log(`- ${customer.name} (${customer.status})`);
});

console.log("\n=== 测试场景覆盖 ===");
console.log("1. 补件功能测试：");
console.log("   - 测试客户-需要补件：部分出货后需要补件");
console.log("   - 测试客户-补件完成：补件流程完整示例");

console.log("\n2. 归档功能测试：");
console.log("   - 测试客户-多次归档恢复：多次归档和恢复操作");
console.log("   - 所有现有客户：包含不同归档状态");

console.log("\n3. 出货功能测试：");
console.log("   - 测试客户-出货状态变更：出货状态变更和取消");
console.log("   - 所有出货状态客户：全部出货、部分出货、未出货");

console.log("\n4. 大批量处理测试：");
console.log("   - 测试客户-大批量：大批量订单处理");

console.log("\n现在可以启动应用程序来测试所有特定功能场景！");