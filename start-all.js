/**
 * 一键启动所有服务
 */

const { spawn } = require('child_process');
const path = require('path');

console.log('启动所有服务...');

// 启动数据同步服务
console.log('启动数据同步服务...');
const syncService = spawn('node', ['src/services/main-service.js'], {
  stdio: 'inherit',
  cwd: __dirname
});

// 等待几秒后启动Electron
setTimeout(() => {
  console.log('启动Electron应用...');
  const electronPath = process.platform === 'win32' ? 'node.exe' : 'node';
  const electronApp = spawn(electronPath, ['C:\\Users\\Administrator\\.npm-global\\node_modules\\electron\\cli.js', 'src/ui/electron-main.js'], {
    stdio: 'inherit',
    cwd: __dirname
  });

  // 处理进程退出
  process.on('SIGINT', () => {
    console.log('正在关闭所有服务...');
    syncService.kill();
    electronApp.kill();
    process.exit(0);
  });

  // 监听Electron进程退出
  electronApp.on('exit', (code) => {
    console.log(`Electron应用已退出，退出码: ${code}`);
    syncService.kill();
    process.exit(code);
  });

  // 监听数据同步服务进程退出
  syncService.on('exit', (code) => {
    console.log(`数据同步服务已退出，退出码: ${code}`);
    electronApp.kill();
    process.exit(code);
  });
}, 3000); // 等待3秒