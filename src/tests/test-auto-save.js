const path = require('path');
const fs = require('fs');
const config = require('../../config.json');
const AutoSaveManager = require('../utils/auto-save-manager');

async function testAutoSave() {
  console.log('开始测试自动保存功能...');
  
  try {
    const autoSaveManager = new AutoSaveManager(config);
    
    // 测试保存工人打包数据
    console.log('测试保存工人打包数据...');
    await autoSaveManager.saveWorkerPackagesData();
    
    // 测试保存客户已打包数据
    console.log('测试保存客户已打包数据...');
    await autoSaveManager.saveCustomerPackedData();
    
    console.log('自动保存功能测试完成');
  } catch (error) {
    console.error('测试过程中发生错误:', error.message);
  }
}

// 运行测试
testAutoSave();