const CustomerDataProcessor = require('./src/utils/customer-data-processor');
const DataManager = require('./src/utils/data-manager');
const fs = require('fs');
const path = require('path');

// 魏敏客户的配置路径
const weiminSourcePath = '\\\\A6\\蓝岸文件\\1、客户总文件\\3、生产\\1、正单\\魏敏';
const outputDir = path.join(__dirname, 'output', '魏敏测试');

console.log('开始测试魏敏客户XML文件查找功能...');
console.log('源路径:', weiminSourcePath);
console.log('输出目录:', outputDir);

// 检查路径是否存在
if (!fs.existsSync(weiminSourcePath)) {
    console.error('❌ 魏敏客户路径不存在:', weiminSourcePath);
    process.exit(1);
}

// 确保输出目录存在
if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
}

console.log('✅ 路径存在，开始处理客户数据...');

// 配置对象
const config = {
    enableNetworkSync: false,
    networkSyncPath: '',
    xmlConfig: {
        fileNameFormat: '{customer}_{line}_{timestamp}',
        outputPath: outputDir
    }
};

// 处理客户数据
CustomerDataProcessor.processCustomerData(
    weiminSourcePath,
    outputDir,
    '魏敏',
    config
)
    .then(result => {
        console.log('\n📊 处理结果:');
        console.log('成功:', result);

        if (result) {
            console.log('✅ XML文件查找功能正常工作！');
        } else {
            console.log('❌ 未找到任何产线或XML文件');
        }
    })
    .catch(error => {
        console.error('❌ 处理过程中出错:');
        console.error(error);
        process.exit(1);
    });