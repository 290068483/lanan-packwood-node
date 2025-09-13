#!/usr/bin/env node

const fs = require('fs');
const XMLDiagnostics = require('./xml-diagnostics');

/**
 * XML文件诊断工具
 * 使用方法: node diagnose-xml.js <xml_file_path>
 */

function main() {
  // 检查命令行参数
  if (process.argv.length < 3) {
    console.log('使用方法: node diagnose-xml.js <xml_file_path>');
    console.log('示例: node diagnose-xml.js "C:\\data\\优化文件.xml"');
    process.exit(1);
  }

  const xmlFilePath = process.argv[2];
  
  // 检查文件是否存在
  if (!fs.existsSync(xmlFilePath)) {
    console.error(`错误: 文件不存在 - ${xmlFilePath}`);
    process.exit(1);
  }
  
  // 检查是否为文件
  const stat = fs.statSync(xmlFilePath);
  if (!stat.isFile()) {
    console.error(`错误: 路径不是文件 - ${xmlFilePath}`);
    process.exit(1);
  }
  
  // 生成诊断报告
  console.log(`正在诊断XML文件: ${xmlFilePath}`);
  const report = XMLDiagnostics.generateReport(xmlFilePath);
  
  // 打印报告
  XMLDiagnostics.printReport(report);
  
  // 根据状态码决定退出码
  if (report.overallStatus === 'CRITICAL') {
    process.exit(2); // 严重问题
  } else if (report.overallStatus === 'WARNING') {
    process.exit(1); // 警告
  } else {
    process.exit(0); // 正常
  }
}

// 执行主函数
if (require.main === module) {
  main();
}

