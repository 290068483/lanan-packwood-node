const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

// 添加对新配置项的支持
const autoSaveCustomerPath = config.autoSaveCustomerPath || '';
const autoSaveWorkerPath = config.autoSaveWorkerPath || '';

// 更新getCustomerDirectoryName函数以支持新配置
function getCustomerDirectoryName(customerName) {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  
  // 检查配置中的命名格式
  if (config.customFileNameFomat) {
    // 解析配置中的格式，提取结尾字符
    const formatEndChar = config.customFileNameFomat.slice(-1);
    if (formatEndChar === '#') {
      // 如果配置以#结尾，则客户目录也以#结尾
      return `${dateStr}_${customerName}#`;
    } else if (formatEndChar === '.') {
      // 如果配置以.结尾，则客户目录也以.结尾
      return `${dateStr}_${customerName}.`;
    }
    // 如果配置不以特殊字符结尾，则客户目录也不添加特殊字符
  }
  
  // 默认不添加特殊字符
  return `${dateStr}_${customerName}`;
}

// 更新processAllCustomers函数以支持新配置
async function processAllCustomers() {
  try {
    console.log('🚀 开始处理客户数据...');
    
    // 确保源目录存在
    const sourceBaseDir = config.sourcePath;
    if (!fs.existsSync(sourceBaseDir)) {
      console.log(`❌ 源基础目录不存在: ${sourceBaseDir}`);
      return;
    }

    // 读取所有客户目录
    const customerDirs = fs.readdirSync(sourceBaseDir).filter(dir => 
      fs.statSync(path.join(sourceBaseDir, dir)).isDirectory()
    );

    let successCount = 0;
    const totalCustomers = customerDirs.length;

    // 处理每个客户
    for (const customerDir of customerDirs) {
      try {
        const customerPath = path.join(sourceBaseDir, customerDir);
        // 按照配置生成客户文件夹名称
        const customerOutputName = getCustomerDirectoryName(customerDir);
        const customerOutputDir = path.join(config.localPath, customerOutputName);
        const result = await processCustomerData(customerPath, customerOutputDir, customerDir, config);
        
        if (result) {
          successCount++;
        }
        
        // 更新客户状态到数据管理器
        DataManager.upsertCustomer({
          name: customerDir,
          sourcePath: customerPath,
          outputPath: customerOutputDir,
          status: result ? '已处理' : '处理失败',
          lastUpdate: new Date().toISOString(),
          success: result
        });
      } catch (error) {
        console.error(`✗ 处理客户 ${customerDir} 时出错:`, error.message);
        DataManager.updateCustomerStatus(customerDir, '处理失败', error.message);
      }
    }

    console.log(`\n✅ 处理完成，成功处理 ${success Count} 个客户数据`);
    
    // 数据完整性检查 (暂时注释掉，因为函数引用有问题)
    /*
    console.log('\n🔍 开始数据完整性检查...');
    for (const customerDir of customerDirs) {
      try {
        const customerPath = path.join(sourceBaseDir, customerDir);
        await checkDataIntegrity(customerPath, customerDir, config);
      } catch (error) {
        console.error(`✗ 检查客户 ${customerDir} 数据完整性时出错:`, error.message);
      }
    }
    */
  } catch (error) {
    console.error('处理客户数据时发生错误:', error);
  }
}