const fs = require('fs');
const path = require('path');

// 读取原始 index.html 文件
const indexContent = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');

// 找到 </body> 标签
const endBodyPos = indexContent.lastIndexOf('</body>');
if (endBodyPos === -1) {
    console.log('无法找到 </body> 标签');
    process.exit(1);
}

// 创建热更新脚本引用
const hotReloadScriptRef = `
<!-- 热更新客户端脚本 -->
<script src="hot-reload-client.js"></script>
`;

// 将热更新脚本引用插入到 </body> 标签之前
const newContent = indexContent.substring(0, endBodyPos) + hotReloadScriptRef + indexContent.substring(endBodyPos);

// 写入修改后的文件
fs.writeFileSync(path.join(__dirname, 'index-with-hot.html'), newContent);
console.log('已创建 index-with-hot.html 文件');
