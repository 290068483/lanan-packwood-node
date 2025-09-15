const fs = require('fs');
const path = require('path');
const FileCompressor = require('../utils/file-compressor');

// 创建测试目录和文件的辅助函数
const testDir = path.join(__dirname, 'test-compression');
const testFilePath = path.join(testDir, 'test.txt');
const testContent = '这是一个用于测试压缩功能的文件内容。Hello, World! 12345';

describe('File Compressor Tests', () => {
  // 在所有测试之前创建测试文件
  beforeAll(() => {
    // 创建测试目录
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
    
    // 创建测试文件
    fs.writeFileSync(testFilePath, testContent, 'utf8');
  });

  // 在所有测试之后清理测试文件
  afterAll(() => {
    // 删除测试文件和目录
    if (fs.existsSync(testFilePath)) {
      fs.unlinkSync(testFilePath);
    }
    
    // 删除压缩文件（如果存在）
    const compressedFile = testFilePath + '.gz';
    if (fs.existsSync(compressedFile)) {
      fs.unlinkSync(compressedFile);
    }
    
    // 删除zip文件（如果存在）
    const zipFile = path.join(testDir, 'test.zip');
    if (fs.existsSync(zipFile)) {
      fs.unlinkSync(zipFile);
    }
    
    // 删除解压目录（如果存在）
    const extractDir = path.join(testDir, 'extracted');
    if (fs.existsSync(extractDir)) {
      fs.rmSync(extractDir, { recursive: true });
    }
    
    // 删除测试目录（如果为空）
    if (fs.existsSync(testDir)) {
      try {
        fs.rmdirSync(testDir);
      } catch (e) {
        // 目录可能不为空，忽略错误
      }
    }
  });

  test('should compress file successfully', async () => {
    const compressedFilePath = await FileCompressor.compressFile(testFilePath);
    
    // 验证压缩文件已创建
    expect(fs.existsSync(compressedFilePath)).toBe(true);
    
    // 验证压缩文件路径正确
    expect(compressedFilePath).toBe(testFilePath + '.gz');
    
    // 验证压缩文件不为空
    const stats = fs.statSync(compressedFilePath);
    expect(stats.size).toBeGreaterThan(0);
  });

  test('should decompress file successfully', async () => {
    // 先压缩文件
    const compressedFilePath = await FileCompressor.compressFile(testFilePath);
    
    // 然后解压缩文件
    const decompressedFilePath = await FileCompressor.decompressFile(compressedFilePath);
    
    // 验证解压文件已创建
    expect(fs.existsSync(decompressedFilePath)).toBe(true);
    
    // 验证解压后的内容与原始内容一致
    const decompressedContent = fs.readFileSync(decompressedFilePath, 'utf8');
    expect(decompressedContent).toBe(testContent);
  });

  test('should handle custom output path for compression', async () => {
    const customOutputPath = path.join(testDir, 'custom-compressed.gz');
    const compressedFilePath = await FileCompressor.compressFile(testFilePath, customOutputPath);
    
    // 验证使用了自定义输出路径
    expect(compressedFilePath).toBe(customOutputPath);
    
    // 验证文件已创建
    expect(fs.existsSync(compressedFilePath)).toBe(true);
  });

  test('should handle custom output path for decompression', async () => {
    // 先压缩文件
    const compressedFilePath = await FileCompressor.compressFile(testFilePath);
    
    // 使用自定义输出路径解压缩
    const customOutputPath = path.join(testDir, 'custom-decompressed.txt');
    const decompressedFilePath = await FileCompressor.decompressFile(compressedFilePath, customOutputPath);
    
    // 验证使用了自定义输出路径
    expect(decompressedFilePath).toBe(customOutputPath);
    
    // 验证文件已创建且内容正确
    expect(fs.existsSync(decompressedFilePath)).toBe(true);
    const decompressedContent = fs.readFileSync(decompressedFilePath, 'utf8');
    expect(decompressedContent).toBe(testContent);
  });

  test('should compress multiple files to zip', async () => {
    // 创建另一个测试文件
    const anotherTestFile = path.join(testDir, 'another-test.txt');
    const anotherTestContent = '这是另一个测试文件的内容。Another test file content.';
    fs.writeFileSync(anotherTestFile, anotherTestContent, 'utf8');
    
    const zipFilePath = path.join(testDir, 'test.zip');
    const filePaths = [testFilePath, anotherTestFile];
    
    const resultPath = await FileCompressor.compressFilesToZip(filePaths, zipFilePath);
    
    // 验证zip文件已创建
    expect(resultPath).toBe(zipFilePath);
    expect(fs.existsSync(zipFilePath)).toBe(true);
    
    // 清理临时文件
    if (fs.existsSync(anotherTestFile)) {
      fs.unlinkSync(anotherTestFile);
    }
  });

  test('should decompress files from zip', async () => {
    // 先创建一个zip文件
    const zipFilePath = path.join(testDir, 'test.zip');
    const filePaths = [testFilePath];
    await FileCompressor.compressFilesToZip(filePaths, zipFilePath);
    
    // 解压文件
    const extractDir = path.join(testDir, 'extracted');
    const extractedFiles = await FileCompressor.decompressFilesFromZip(zipFilePath, extractDir);
    
    // 验证解压成功
    expect(extractedFiles.length).toBe(1);
    expect(fs.existsSync(extractedFiles[0])).toBe(true);
    
    // 验证内容正确（使用Buffer比较避免编码问题）
    const originalBuffer = fs.readFileSync(testFilePath);
    const extractedBuffer = fs.readFileSync(extractedFiles[0]);
    expect(extractedBuffer.equals(originalBuffer)).toBe(true);
  });

  test('should throw error when compressing non-existent file', async () => {
    const nonExistentFile = path.join(testDir, 'non-existent.txt');
    
    await expect(FileCompressor.compressFile(nonExistentFile))
      .rejects
      .toThrow('输入文件不存在');
  });

  test('should throw error when decompressing non-existent file', async () => {
    const nonExistentFile = path.join(testDir, 'non-existent.gz');
    
    await expect(FileCompressor.decompressFile(nonExistentFile))
      .rejects
      .toThrow('输入文件不存在');
  });
});