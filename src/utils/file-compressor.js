const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

/**
 * 通用文件压缩工具类
 */
class FileCompressor {
  /**
   * 压缩单个文件
   * @param {string} inputPath - 输入文件路径
   * @param {string} outputPath - 输出文件路径（可选，默认为输入路径+.gz）
   * @param {Object} options - 压缩选项
   * @returns {Promise<string>} 压缩后的文件路径
   */
  static async compressFile(inputPath, outputPath = null, options = {}) {
    return new Promise((resolve, reject) => {
      // 检查输入文件是否存在
      if (!fs.existsSync(inputPath)) {
        reject(new Error(`输入文件不存在: ${inputPath}`));
        return;
      }

      // 如果没有指定输出路径，则使用默认路径（添加.gz后缀）
      if (!outputPath) {
        outputPath = `${inputPath}.gz`;
      }

      // 确保输出目录存在
      const outputDir = path.dirname(outputPath);
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      // 创建读取流和写入流
      const inputStream = fs.createReadStream(inputPath);
      const outputStream = fs.createWriteStream(outputPath);
      
      // 创建gzip压缩流
      const gzip = zlib.createGzip(options);

      // 管道连接：输入流 -> 压缩流 -> 输出流
      inputStream
        .pipe(gzip)
        .pipe(outputStream)
        .on('finish', () => {
          resolve(outputPath);
        })
        .on('error', (err) => {
          reject(err);
        });
    });
  }

  /**
   * 解压缩单个文件
   * @param {string} inputPath - 输入压缩文件路径
   * @param {string} outputPath - 输出文件路径（可选）
   * @returns {Promise<string>} 解压后的文件路径
   */
  static async decompressFile(inputPath, outputPath = null) {
    return new Promise((resolve, reject) => {
      // 检查输入文件是否存在
      if (!fs.existsSync(inputPath)) {
        reject(new Error(`输入文件不存在: ${inputPath}`));
        return;
      }

      // 如果没有指定输出路径，则使用默认路径（移除.gz后缀）
      if (!outputPath) {
        if (path.extname(inputPath) === '.gz') {
          outputPath = inputPath.slice(0, -3);
        } else {
          outputPath = `${inputPath}.decompressed`;
        }
      }

      // 确保输出目录存在
      const outputDir = path.dirname(outputPath);
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      // 创建读取流和写入流
      const inputStream = fs.createReadStream(inputPath);
      const outputStream = fs.createWriteStream(outputPath);
      
      // 创建gunzip解压缩流
      const gunzip = zlib.createGunzip();

      // 管道连接：输入流 -> 解压缩流 -> 输出流
      inputStream
        .pipe(gunzip)
        .pipe(outputStream)
        .on('finish', () => {
          resolve(outputPath);
        })
        .on('error', (err) => {
          reject(err);
        });
    });
  }

  /**
   * 压缩多个文件为一个zip文件
   * @param {Array<string>} filePaths - 要压缩的文件路径数组
   * @param {string} outputZipPath - 输出zip文件路径
   * @returns {Promise<string>} zip文件路径
   */
  static async compressFilesToZip(filePaths, outputZipPath) {
    try {
      // 检查所有文件是否存在
      for (const filePath of filePaths) {
        if (!fs.existsSync(filePath)) {
          throw new Error(`文件不存在: ${filePath}`);
        }
      }

      // 确保输出目录存在
      const outputDir = path.dirname(outputZipPath);
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      // 使用zlib创建一个包含所有文件的压缩数据
      const archiveData = [];
      
      for (const filePath of filePaths) {
        const fileName = path.basename(filePath);
        const fileContent = fs.readFileSync(filePath);
        archiveData.push({
          name: fileName,
          content: fileContent.toString('binary'), // 使用binary编码直接保存原始二进制数据
          size: fileContent.length
        });
      }

      // 将数据转换为JSON并压缩
      const jsonData = JSON.stringify(archiveData);
      const compressedData = zlib.gzipSync(jsonData);
      
      // 写入压缩文件
      fs.writeFileSync(outputZipPath, compressedData);
      
      return outputZipPath;
    } catch (error) {
      throw new Error(`压缩文件失败: ${error.message}`);
    }
  }

  /**
   * 从zip文件解压所有文件到指定目录
   * @param {string} inputZipPath - 输入zip文件路径
   * @param {string} outputDir - 输出目录路径
   * @returns {Promise<Array<string>>} 解压后的文件路径数组
   */
  static async decompressFilesFromZip(inputZipPath, outputDir) {
    try {
      // 检查输入文件是否存在
      if (!fs.existsSync(inputZipPath)) {
        throw new Error(`输入文件不存在: ${inputZipPath}`);
      }

      // 确保输出目录存在
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      // 读取并解压数据
      const compressedData = fs.readFileSync(inputZipPath);
      const jsonData = zlib.gunzipSync(compressedData);
      const archiveData = JSON.parse(jsonData);

      // 解压所有文件
      const extractedFiles = [];
      for (const fileData of archiveData) {
        const outputPath = path.join(outputDir, fileData.name);
        fs.writeFileSync(outputPath, fileData.content);
        extractedFiles.push(outputPath);
      }

      return extractedFiles;
    } catch (error) {
      throw new Error(`解压文件失败: ${error.message}`);
    }
  }
}

module.exports = FileCompressor;