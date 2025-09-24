const { execSync } = require('child_process');

// 设置 Electron 镜像源并安装 Electron
console.log('Setting Electron mirror and installing Electron...');

try {
  // 设置 Electron 镜像源
  execSync('npm config set registry https://registry.npmmirror.com', { stdio: 'inherit' });
  
  // 清除 Electron 缓存
  execSync('npm cache clean --force', { stdio: 'inherit' });
  
  // 卸载现有 Electron
  execSync('npm uninstall electron --save-dev', { stdio: 'inherit' });
  
  // 重新安装 Electron
  execSync('npm install electron@38.1.0 --save-dev --force', { stdio: 'inherit' });
  
  console.log('Electron installation completed successfully!');
} catch (error) {
  console.error('Error installing Electron:', error.message);
  process.exit(1);
}