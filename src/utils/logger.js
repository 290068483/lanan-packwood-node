const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

/**
 * 日志系统模块
 * 用于记录客户处理过程中的详细日志信息，包括错误上下文
 */

// 确保日志目录存在
const logDir = path.join(__dirname, '..', '..', 'logs');
if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
}

// 日志文件路径
const errorLogPath = path.join(logDir, 'error.log');
const infoLogPath = path.join(logDir, 'info.log');
const warningLogPath = path.join(logDir, 'warning.log');
const successLogPath = path.join(logDir, 'success.log');
const systemLogPath = path.join(logDir, 'system.log');
const systemErrorLogPath = path.join(logDir, 'system-error.log');
const diagnosticsLogPath = path.join(logDir, 'diagnostics.log');

/**
/**
 * 记录错误日志
 * @param {string} customer - 客户名称
 * @param {string} module - 模块名称
 * @param {string} message - 错误信息
 * @param {string} stack - 错误堆栈
 * @param {Object} context - 错误上下文信息
 */
function logError(customer, module, message, stack, context = null) {
    const timestamp = new Date().toISOString();
    let logEntry = `[${timestamp}] [ERROR] [${customer}] [${module}] ${message}\n`;
    
    // 如果有上下文信息，添加到日志中
    if (context) {
        logEntry += `[CONTEXT] ${JSON.stringify(context)}\n`;
    }
    
    // 写入日志文件（追加模式）
    fs.appendFileSync(errorLogPath, logEntry);
    
    // 控制台输出带颜色的错误信息
    console.log(chalk.red('✗'), chalk.gray(`[${customer}]`), chalk.red(message));
    
    // 如果有堆栈信息，单独记录
    if (stack) {
        fs.appendFileSync(errorLogPath, `${stack}\n`);
    }
}

/**
/**
 * 记录信息日志
 * @param {string} customer - 客户名称
 * @param {string} module - 模块名称
 * @param {string} message - 信息内容
 */
function logInfo(customer, module, message) {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] [INFO] [${customer}] [${module}] ${message}\n`;
    
    // 写入日志文件（追加模式）
    fs.appendFileSync(infoLogPath, logEntry);
    
    // 控制台输出带颜色的信息
    console.log(chalk.blue('ℹ'), chalk.gray(`[${customer}]`), chalk.blue(message));
}

/**
/**
 * 记录警告日志
 * @param {string} customer - 客户名称
 * @param {string} module - 模块名称
 * @param {string} message - 警告信息
 * @param {Object} context - 警告上下文信息
 */
function logWarning(customer, module, message, context = null) {
    const timestamp = new Date().toISOString();
    let logEntry = `[${timestamp}] [WARNING] [${customer}] [${module}] ${message}\n`;
    
    // 如果有上下文信息，添加到日志中
    if (context) {
        logEntry += `[CONTEXT] ${JSON.stringify(context)}\n`;
    }
    
    // 写入日志文件（追加模式）
    fs.appendFileSync(warningLogPath, logEntry);
    
    // 控制台输出带颜色的警告信息
    console.log(chalk.yellow('⚠'), chalk.gray(`[${customer}]`), chalk.yellow(message));
}

/**
/**
 * 记录成功日志
 * @param {string} customer - 客户名称
 * @param {string} module - 模块名称
 * @param {string} message - 成功信息
 */
function logSuccess(customer, module, message) {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] [SUCCESS] [${customer}] [${module}] ${message}\n`;
    
    // 写入日志文件（追加模式）
    fs.appendFileSync(successLogPath, logEntry);
    
    // 控制台输出带颜色的成功信息
    console.log(chalk.green('✓'), chalk.gray(`[${customer}]`), chalk.green(message));
}

/**
 * 记录系统信息日志
 * @param {string} message - 信息内容
 */
function logSystemInfo(message) {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] [SYSTEM] [INFO] ${message}\n`;
    
    // 写入日志文件（追加模式）
    fs.appendFileSync(systemLogPath, logEntry);
    
    // 控制台输出带颜色的系统信息
    console.log(chalk.cyan('ℹ SYSTEM'), chalk.cyan(message));
}

/**
 * 记录系统错误日志
 * @param {string} message - 错误信息
 * @param {string} stack - 错误堆栈
 */
function logSystemError(message, stack) {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] [SYSTEM] [ERROR] ${message}\n`;
    
    // 写入日志文件（追加模式）
    fs.appendFileSync(systemErrorLogPath, logEntry);
    
    // 控制台输出带颜色的系统错误信息
    console.error(chalk.red('✗ SYSTEM ERROR'), chalk.red(message));
    
    // 如果有堆栈信息，单独记录
    if (stack) {
        fs.appendFileSync(systemErrorLogPath, `${stack}\n`);
    }
}

/**
 * 记录诊断日志
 * @param {string} fileName - 文件名
 * @param {Object} diagnostics - 诊断信息
 */
function logDiagnostics(fileName, diagnostics) {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] [DIAGNOSTICS] [${fileName}] ${JSON.stringify(diagnostics)}\n`;
    
    // 写入日志文件（追加模式）
    fs.appendFileSync(diagnosticsLogPath, logEntry);
}

module.exports = {
    logError,
    logInfo,
    logWarning,
    logSuccess,
    logSystemInfo,
    logSystemError,
    logDiagnostics
};