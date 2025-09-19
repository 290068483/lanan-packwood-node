@echo off
echo 安装测试依赖...
cd tests
npm install
cd ..

echo 运行归档模块测试...
npm test -- --testNamePattern="归档" --verbose
