const fs = require('fs');
const path = require('path');

// 导入我们修改过的模块
const tempXmlGenerator = require('./src/utils/temp-xml-generator');

// 创建临时目录
try {
    if (!fs.existsSync('./temp-test')) {
        fs.mkdirSync('./temp-test', { recursive: true });
    }
} catch (error) {
    console.error('创建临时目录失败:', error);
    process.exit(1);
}

// 模拟从XML中提取的Cabinet数据（12个Cabinet）
const mockCabinets = Array.from({ length: 12 }, (_, i) => ({
    '@_ID': `cabinet_${i + 1}`,
    '@_Name': `_${i + 1}`,
    Panels: {
        Panel: [] // 这里Panel会被平均分配
    }
}));

// 创建模拟的Panel数据（850个Panel，与调试结果一致）
const mockPanels = Array.from({ length: 850 }, (_, i) => ({
    '_ProductionLine': 'N1产线',
    '_ActualLength': 652,
    '_ActualWidth': 648,
    '_Name': `测试板${i + 1}`,
    '_ID': `1008978660${100 + i}`
    // 注意：这里没有Cabinet属性，模拟实际情况
}));

// 测试函数
function runTest() {
    console.log('====================================');
    console.log('开始测试：修复多Cabinet生成问题');
    console.log('====================================');
    console.log(`模拟数据：${mockCabinets.length}个Cabinet, ${mockPanels.length}个Panel`);
    
    // 调用修改后的函数
    const testXmlPath = path.join('./temp-test', 'test-output.xml');
    
    try {
        // 使用我们修改过的generateTempXml函数，并传入mockCabinets
        tempXmlGenerator.generateTempXml(mockPanels, testXmlPath, '测试客户', '测试产线', mockCabinets);
        
        console.log('\n✅ XML文件生成成功！');
        console.log(`   输出路径: ${testXmlPath}`);
        
        // 读取生成的XML文件并检查cabinets标签数量
        const xmlContent = fs.readFileSync(testXmlPath, 'utf8');
        
        // 计算<cabinets>标签的数量
        const cabinetsRegex = /<cabinets>/g;
        const cabinetsCount = (xmlContent.match(cabinetsRegex) || []).length;
        
        console.log(`\n📊 结果统计:`);
        console.log(`   - 生成的<cabinets>标签数量: ${cabinetsCount}`);
        console.log(`   - 期望的<cabinets>标签数量: ${mockCabinets.length}`);
        
        if (cabinetsCount === mockCabinets.length) {
            console.log('\n🎉 测试通过！成功为每个原始Cabinet生成了对应的<cabinets>标签。');
        } else {
            console.log('\n❌ 测试失败：生成的<cabinets>标签数量与预期不符。');
        }
        
        // 提取前几个<cabinets>标签的名称，验证是否正确
        const nameRegex = /<Name>([^<]+)<\/Name>/g;
        const names = [];
        let match;
        while ((match = nameRegex.exec(xmlContent)) !== null && names.length < 5) {
            names.push(match[1]);
        }
        
        if (names.length > 0) {
            console.log('\n🔍 前几个Cabinet名称：', names.join(', '));
        }
        
    } catch (error) {
        console.error('\n❌ 测试失败:', error);
    }
    
    console.log('\n====================================');
    console.log('测试结束');
    console.log('====================================');
}

// 运行测试
runTest();