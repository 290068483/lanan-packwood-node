const fs = require('fs');
const path = require('path');

// 修复Electron cli.js缺失问题
function fixElectronCli() {
    const electronPath = path.join(__dirname, 'node_modules', '.pnpm', 'electron@38.1.0', 'node_modules', 'electron');
    const cliJsPath = path.join(electronPath, 'cli.js');

    // 检查是否已存在cli.js
    if (!fs.existsSync(cliJsPath)) {
        // 创建cli.js文件
        const cliJsContent = `#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

// 获取electron可执行文件路径
const electronExecutable = process.platform === 'win32' 
  ? path.join(__dirname, 'dist', 'electron.exe')
  : path.join(__dirname, 'dist', 'electron');

// 传递所有参数给electron可执行文件
const args = process.argv.slice(2);

// 运行electron
const child = spawn(electronExecutable, args, { stdio: 'inherit' });

child.on('close', (code) => {
  process.exit(code);
});

child.on('error', (err) => {
  console.error('Failed to start electron:', err);
  process.exit(1);
});
`;

        fs.writeFileSync(cliJsPath, cliJsContent);
        console.log('✓ Created missing cli.js file');
    } else {
        console.log('✓ cli.js already exists');
    }

    // 修复package.json中的bin配置
    const packageJsonPath = path.join(electronPath, 'package.json');
    if (fs.existsSync(packageJsonPath)) {
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

        if (!packageJson.bin || !packageJson.bin.electron) {
            packageJson.bin = {
                electron: './cli.js'
            };
            fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
            console.log('✓ Fixed package.json bin configuration');
        } else {
            console.log('✓ Package.json bin configuration is correct');
        }
    }
}

// 创建符号链接到node_modules/.bin目录
function createBinSymlink() {
    const electronBinPath = path.join(__dirname, 'node_modules', '.bin', 'electron');
    const electronCliPath = path.join(__dirname, 'node_modules', '.pnpm', 'electron@38.1.0', 'node_modules', 'electron', 'cli.js');

    // 如果.bin目录不存在，创建它
    const binDir = path.join(__dirname, 'node_modules', '.bin');
    if (!fs.existsSync(binDir)) {
        fs.mkdirSync(binDir, { recursive: true });
    }

    // 创建符号链接或复制文件
    if (!fs.existsSync(electronBinPath)) {
        try {
            fs.symlinkSync(electronCliPath, electronBinPath, 'file');
            console.log('✓ Created symlink in .bin directory');
        } catch (err) {
            // 如果符号链接失败，尝试复制文件
            if (fs.existsSync(electronCliPath)) {
                fs.copyFileSync(electronCliPath, electronBinPath);
                console.log('✓ Copied cli.js to .bin directory');
            }
        }
    } else {
        console.log('✓ Electron bin already exists');
    }
}

// 主函数
function main() {
    try {
        console.log('Fixing Electron installation...');
        fixElectronCli();
        createBinSymlink();
        console.log('✓ Electron installation fixed successfully!');
        console.log('You can now run: npm run electron');
    } catch (error) {
        console.error('Error fixing Electron installation:', error);
        process.exit(1);
    }
}

// 运行修复
if (require.main === module) {
    main();
}

module.exports = { fixElectronCli, createBinSymlink };