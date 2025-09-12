const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

/**
 * 日志系统模块
 * 用于记录客户处理过程中的错误信息
 */

// 确保日志目录存在
const logDir = path.join(__dirname, '..', '..', 'logs');
if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
}

/**
 * 记录错误日志
 * @param {string} customerName - 客户姓名
 * @param {string} productionLine - 产线名称
 * @param {string} errorMessage - 错误信息
 * @param {string} errorStack - 错误堆栈（可选）
 */
function logError(customerName, productionLine, errorMessage, errorStack = '') {
    const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, ''); // YYYYMMDD格式
    const logFileName = `error_log_${timestamp}.txt`;
    const logFilePath = path.join(logDir, logFileName);
    
    const logEntry = `[${new Date().toISOString()}] ${timestamp} ${customerName} ${productionLine} ${errorMessage}\n`;
    
    // 如果有错误堆栈，也记录下来
    let fullLogEntry = logEntry;
    if (errorStack) {
        fullLogEntry += `  Stack: ${errorStack}\n`;
    }
    
    // 写入日志文件（追加模式）
    fs.appendFileSync(logFilePath, fullLogEntry, 'utf8');
    
    // 控制台输出带颜色的错误信息
    console.log(chalk.red('✗ 错误已记录到日志文件:'), chalk.gray(logFilePath));
}

/**
 * 记录处理日志
 * @param {string} customerName - 客户姓名
 * @param {string} productionLine - 产线名称
 * @param {string} message - 日志信息
 */
function logInfo(customerName, productionLine, message) {
    const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, ''); // YYYYMMDD格式
    const logFileName = `process_log_${timestamp}.txt`;
    const logFilePath = path.join(logDir, logFileName);
    
    const logEntry = `[${new Date().toISOString()}] ${timestamp} ${customerName} ${productionLine} ${message}\n`;
    
    // 写入日志文件（追加模式）
    fs.appendFileSync(logFilePath, logEntry, 'utf8');
    
    // 控制台输出带颜色的信息
    console.log(chalk.blue('ℹ'), chalk.gray(`[${customerName}]`), chalk.green(message));
}

/**
 * 记录警告日志
 * @param {string} customerName - 客户姓名
 * @param {string} productionLine - 产线名称
 * @param {string} message - 警告信息
 */
function logWarning(customerName, productionLine, message) {
    const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, ''); // YYYYMMDD格式
    const logFileName = `warning_log_${timestamp}.txt`;
    const logFilePath = path.join(logDir, logFileName);
    
    const logEntry = `[${new Date().toISOString()}] ${timestamp} ${customerName} ${productionLine} ${message}\n`;
    
    // 写入日志文件（追加模式）
    fs.appendFileSync(logFilePath, logEntry, 'utf8');
    
    // 控制台输出带颜色的警告信息
    console.log(chalk.yellow('⚠'), chalk.gray(`[${customerName}]`), chalk.yellow(message));
}

/**
 * 记录成功日志
 * @param {string} customerName - 客户姓名
 * @param {string} productionLine - 产线名称
 * @param {string} message - 成功信息
 */
function logSuccess(customerName, productionLine, message) {
    const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, ''); // YYYYMMDD格式
    const logFileName = `success_log_${timestamp}.txt`;
    const logFilePath = path.join(logDir, logFileName);
    
    const logEntry = `[${new Date().toISOString()}] ${timestamp} ${customerName} ${productionLine} ${message}\n`;
    
    // 写入日志文件（追加模式）
    fs.appendFileSync(logFilePath, logEntry, 'utf8');
    
    // 控制台输出带颜色的成功信息
    console.log(chalk.green('✓'), chalk.gray(`[${customerName}]`), chalk.green(message));
}

module.exports = {
    logError,
    logInfo,
    logWarning,
    logSuccess
};