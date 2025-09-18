const { spawn } = require('child_process');
const path = require('path');

// 直接启动Electron应用
function startElectron() {
    const electronPath = path.join(__dirname, 'node_modules', '.pnpm', 'electron@38.1.0', 'node_modules', 'electron', 'dist', 'electron.exe');
    const mainScript = path.join(__dirname, 'src', 'ui', 'electron-main.js');

    console.log('Starting Electron application...');
    console.log('Electron path:', electronPath);
    console.log('Main script:', mainScript);

    // 启动Electron
    const electronProcess = spawn(electronPath, [mainScript], {
        stdio: 'inherit',
        windowsHide: false
    });

    electronProcess.on('close', (code) => {
        console.log(`Electron process exited with code ${code}`);
    });

    electronProcess.on('error', (err) => {
        console.error('Failed to start Electron:', err);
    });
}

// 检查文件是否存在
function checkFiles() {
    const requiredFiles = [
        path.join(__dirname, 'node_modules', '.pnpm', 'electron@38.1.0', 'node_modules', 'electron', 'dist', 'electron.exe'),
        path.join(__dirname, 'src', 'ui', 'electron-main.js')
    ];

    requiredFiles.forEach(file => {
        const fs = require('fs');
        if (fs.existsSync(file)) {
            console.log(`✓ ${path.basename(file)} exists`);
        } else {
            console.error(`✗ ${path.basename(file)} not found`);
        }
    });
}

// 主函数
if (require.main === module) {
    console.log('Checking Electron installation...');
    checkFiles();
    startElectron();
}