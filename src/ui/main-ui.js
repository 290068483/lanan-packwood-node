const fs = require('fs');
const path = require('path');
const DataManager = require('../utils/data-manager');

class MainUI {
  constructor() {
    this.customers = [];
    this.settings = DataManager.getSettings() || {};
  }

  // 初始化界面
  init() {
    console.log('=== 客户数据打包管理系统 ===');
    this.loadCustomers();
    this.showMainMenu();
  }

  // 加载客户数据
  loadCustomers() {
    this.customers = DataManager.getAllCustomers();
    console.log(`已加载 ${this.customers.length} 个客户数据`);
  }

  // 显示主菜单
  showMainMenu() {
    console.log('\n请选择操作:');
    console.log('1. 选择源地址');
    console.log('2. 选择输出地址');
    console.log('3. 选择保存客户打包地址');
    console.log('4. 选择保存工人打包地址');
    console.log('5. 查看自动保存的数据');
    //  默认显示的，去除这个部分功能。
    console.log('6. 显示客户信息表格');
    console.log('0. 退出');

    // 这里应该接入实际的输入处理逻辑
    // 为简化演示，我们直接显示客户表格
    this.showCustomerTable();
  }

  // 显示客户信息表格
  showCustomerTable() {
    console.log('\n=== 客户信息和打包状态 ===');
    console.log(
      '---------------------------------------------------------------------'
    );
    console.log('客户名称\t\t源地址\t\t\t输出地址\t\t打包状态\t最后更新时间');
    console.log(
      '---------------------------------------------------------------------'
    );

    if (this.customers.length === 0) {
      console.log('暂无客户数据');
    } else {
      this.customers.forEach(customer => {
        const name = customer.name || '';
        const sourcePath = customer.sourcePath
          ? this.abbreviatePath(customer.sourcePath)
          : '';
        const outputPath = customer.outputPath
          ? this.abbreviatePath(customer.outputPath)
          : '';
        const status = customer.status || '未知';
        const lastUpdate = customer.lastUpdate
          ? new Date(customer.lastUpdate).toLocaleDateString()
          : '';

        console.log(
          `${name}\t\t${sourcePath}\t\t${outputPath}\t\t${status}\t${lastUpdate}`
        );
      });
    }

    console.log(
      '---------------------------------------------------------------------'
    );
  }

  // 缩短路径显示
  abbreviatePath(fullPath) {
    if (!fullPath) return '';

    // 只显示路径的最后两个部分
    const parts = fullPath.split(path.sep);
    if (parts.length <= 2) {
      return fullPath;
    }
    return `...${path.sep}${parts[parts.length - 2]}${path.sep}${
      parts[parts.length - 1]
    }`;
  }

  // 选择源地址
  selectSourceDirectory() {
    console.log('选择源地址功能已触发');
    // 这里应该打开文件选择对话框
    // 为简化演示，我们使用模拟数据
    const mockSourcePath =
      'C:\\Program Files (x86)\\MPM\\temp\\local\\250916 陈勇#';
    console.log(`已选择源地址: ${mockSourcePath}`);

    // 提取客户名称（从路径中获取）
    const customerName = this.extractCustomerName(mockSourcePath);
    console.log(`识别到客户名称: ${customerName}`);

    // 保存到数据管理器
    DataManager.upsertCustomer({
      name: customerName,
      sourcePath: mockSourcePath,
      outputPath: this.settings.outputPath || 'C:\\output',
      status: '未处理',
      lastUpdate: new Date().toISOString(),
    });

    // 重新加载客户数据
    this.loadCustomers();
    console.log('客户信息已保存');
  }

  // 从路径中提取客户名称
  extractCustomerName(sourcePath) {
    // 简单实现：从路径最后一部分提取客户名
    const parts = sourcePath.split(path.sep);
    const lastPart = parts[parts.length - 1];
    // 移除可能的 # 号
    return lastPart.replace('#', '');
  }

  // 选择输出地址
  selectOutputDirectory() {
    console.log('选择输出地址功能已触发');
    // 这里应该打开文件选择对话框
    // 为简化演示，我们使用模拟数据
    const mockOutputPath = 'C:\\output\\customer_data';
    console.log(`已选择输出地址: ${mockOutputPath}`);

    // 保存设置
    this.settings.outputPath = mockOutputPath;
    DataManager.saveSettings(this.settings);
    console.log('输出地址已保存到设置');
  }

  // 自动保存客户打包数据
  autoSaveCustomerData() {
    console.log('自动保存客户打包数据功能已启动');
    // 这里应该启动文件监控和自动处理逻辑
    console.log('正在监控客户数据目录变化...');
  }

  // 自动保存工人打包数据
  autoSaveWorkerData() {
    console.log('自动保存工人打包数据功能已启动');
    // 这里应该启动工人数据监控和自动处理逻辑
    console.log('正在监控工人打包数据目录变化...');
  }

  // 查看自动保存的数据
  viewAutoSavedData() {
    console.log('查看自动保存的数据功能已触发');
    // 显示详细的历史记录和状态信息
    const history = DataManager.getHistoryRecords(10);
    console.log('\n=== 最近10条历史记录 ===');
    if (history.length === 0) {
      console.log('暂无历史记录');
    } else {
      history.forEach((record, index) => {
        console.log(
          `${index + 1}. ${record.action} - ${record.customerName} - ${new Date(
            record.timestamp
          ).toLocaleString()}`
        );
      });
    }
  }
}

module.exports = MainUI;
