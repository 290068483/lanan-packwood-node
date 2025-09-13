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

// 获取当前日期字符串 (YYYY-MM-DD)
function getCurrentDate() {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

// 删除7天前的日志文件
function removeOldLogFiles() {
  try {
    const files = fs.readdirSync(logDir);

    // 计算7天前的日期
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const sevenDaysAgoStr = sevenDaysAgo.toISOString().slice(0, 10);

    files.forEach(file => {
      // 检查文件名是否包含日期前缀 (YYYY-MM-DD)
      const dateMatch = file.match(/^(\d{4}-\d{2}-\d{2})_/);
      if (dateMatch) {
        const fileDate = dateMatch[1];
        // 如果文件日期早于7天前，则删除
        if (fileDate < sevenDaysAgoStr) {
          const filePath = path.join(logDir, file);
          fs.unlinkSync(filePath);
          console.log(`已删除过期日志文件: ${file}`);
        }
      }
    });
  } catch (error) {
    console.error('清理过期日志文件时出错:', error.message);
  }
}

// 日志文件路径（包含日期）
function getLogFilePath(baseName) {
  const date = getCurrentDate();
  return path.join(logDir, `${date}_${baseName}`);
}

const errorLogPath = getLogFilePath('error.log');
const infoLogPath = getLogFilePath('info.log');
const warningLogPath = getLogFilePath('warning.log');
const successLogPath = getLogFilePath('success.log');
const systemLogPath = getLogFilePath('system.log');
const systemErrorLogPath = getLogFilePath('system-error.log');
const diagnosticsLogPath = getLogFilePath('diagnostics.log');
const lostDataLogPath = getLogFilePath('lost-data.log');

// 初始运行时删除过期的日志文件
removeOldLogFiles();

/**
 * 记录客户丢失数据日志
 * @param {string} customer - 客户名称
 * @param {string} lineName - 产线名称
 * @param {number} lostCount - 丢失数据数量
 * @param {string} reason - 丢失原因
 */
function logLostData(customer, lineName, lostCount, reason) {
  const timestamp = new Date().toISOString();
  const logEntry = `[${timestamp}] [LOST_DATA] [${customer}] [${lineName}] 丢失数量: ${lostCount}, 原因: ${reason}\n`;

  // 写入日志文件（追加模式）
  fs.appendFileSync(lostDataLogPath, logEntry);

  // 控制台输出带颜色的丢失数据信息
  console.log(
    chalk.yellow('⚠'),
    chalk.gray(`[${customer}]`),
    chalk.yellow(`产线"${lineName}"丢失${lostCount}条数据: ${reason}`)
  );
}

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
  console.log(
    chalk.blue('ℹ'),
    chalk.gray(`[${customer}]`),
    chalk.blue(message)
  );
}

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
  console.log(
    chalk.yellow('⚠'),
    chalk.gray(`[${customer}]`),
    chalk.yellow(message)
  );
}

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
  console.log(
    chalk.green('✓'),
    chalk.gray(`[${customer}]`),
    chalk.green(message)
  );
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
  logDiagnostics,
  logLostData,
};
