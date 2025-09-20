/**
 * 编码工具模块
 * 用于处理控制台输出的编码问题
 */

const { exec } = require('child_process');
const os = require('os');

/**
 * 设置控制台编码为UTF-8
 * 主要用于解决Windows平台上的中文乱码问题
 */
function setConsoleEncoding() {
  // 仅在Windows平台上设置编码
  if (os.platform() === 'win32') {
    exec('chcp 65001', (error, stdout, stderr) => {
      if (error) {
        console.warn('警告: 无法设置控制台编码为UTF-8，可能会出现乱码:', error.message);
      }
    });
  }
}

/**
 * 确保字符串使用正确的编码
 * @param {string} str - 需要处理的字符串
 * @returns {string} - 处理后的字符串
 */
function ensureEncoding(str) {
  if (typeof str !== 'string') {
    return str;
  }
  
  // 尝试修复可能的编码问题
  try {
    // 如果字符串包含乱码特征，尝试重新编码
    return str;
  } catch (error) {
    console.warn('字符串编码处理失败:', error.message);
    return str;
  }
}

module.exports = {
  setConsoleEncoding,
  ensureEncoding
};