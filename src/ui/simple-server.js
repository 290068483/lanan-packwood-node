const http = require('http');
const url = require('url');
const path = require('path');
const fs = require('fs');

// MIME类型映射
const mimeTypes = {
    '.html': 'text/html',
    '.js': 'application/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon'
};

const server = http.createServer((req, res) => {
    const parsedUrl = url.parse(req.url, true);
    let pathname = parsedUrl.pathname;

    // 默认页面
    if (pathname === '/') {
        pathname = '/index.html';
    }

    // 构建文件路径
    const filePath = path.join(__dirname, pathname);

    // 静态文件服务
    serveStaticFile(res, filePath);
});

// 服务静态文件
function serveStaticFile(res, filePath) {
    const extname = String(path.extname(filePath)).toLowerCase();
    const contentType = mimeTypes[extname] || 'application/octet-stream';

    fs.readFile(filePath, function (error, content) {
        if (error) {
            if (error.code == 'ENOENT') {
                console.log(`文件未找到: ${filePath}`);
                res.writeHead(404);
                res.end('404 文件未找到');
            } else {
                console.error(`服务器错误: ${error.code}`);
                res.writeHead(500);
                res.end('服务器内部错误: ' + error.code + ' ..\n');
            }
        } else {
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content, 'utf-8');
        }
    });
}

// 启动服务器
const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
    console.log(`简单服务器运行在端口 ${PORT}`);
    console.log(`访问地址: http://localhost:${PORT}`);
});

module.exports = server;