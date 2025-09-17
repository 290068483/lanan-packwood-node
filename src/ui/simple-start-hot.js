#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

console.log('启动简单热更新环境...');

// 启动热更新服务器
const hotServer = spawn('node', [path.join(__dirname, 'simple-hot-reload.js')]);

hotServer.stdout.on('data', (data) => {
  console.log(`[热更新服务器] ${data}`);
});

hotServer.stderr.on('data', (data) => {
  console.error(`[热更新服务器错误] ${data}`);
});

hotServer.on('close', (code) => {
  console.log(`热更新服务器退出，代码 ${code}`);
});

// 等待热更新服务器启动
setTimeout(() => {
  console.log('\n启动 Electron 应用...');

  // 启动 Electron 应用，并传递热更新参数
  const electronApp = spawn('electron', [path.join(__dirname, 'index.html'), '--hot'], {
    stdio: 'inherit'
  });

  electronApp.on('close', (code) => {
    console.log(`\nElectron 应用退出，代码 ${code}`);
    process.exit(code);
  });

  // 处理 Ctrl+C
  process.on('SIGINT', () => {
    console.log('\n正在关闭热更新环境...');
    electronApp.kill();
    hotServer.kill();
    process.exit(0);
  });
}, 2000); // 等待2秒让热更新服务器启动
