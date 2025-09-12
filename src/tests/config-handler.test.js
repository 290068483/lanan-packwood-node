const fs = require('fs');
const path = require('path');

// 模拟配置文件
jest.mock('../../config.json', () => ({
  sourcePath: "C:\\Users\\Administrator\\Desktop\\打包数据源的数据",
  localPath: "./src/local",
  networkPath: "\\\\c1\\mpm\\temp\\local\\test",
  targetFileName: "板件明细.xlsx",
  enableNetworkSync: true
}));

describe('Config Handler Tests', () => {
  let config;
  
  beforeEach(() => {
    config = require('../../config.json');
  });

  test('should load config file correctly', () => {
    expect(config).toBeDefined();
    expect(config).toHaveProperty('sourcePath');
    expect(config).toHaveProperty('localPath');
    expect(config).toHaveProperty('networkPath');
    expect(config).toHaveProperty('targetFileName');
    expect(config).toHaveProperty('enableNetworkSync');
  });

  test('should have correct config values', () => {
    expect(typeof config.sourcePath).toBe('string');
    expect(typeof config.localPath).toBe('string');
    expect(typeof config.networkPath).toBe('string');
    expect(typeof config.targetFileName).toBe('string');
    expect(typeof config.enableNetworkSync).toBe('boolean');
  });

  test('should have non-empty path values', () => {
    expect(config.sourcePath).not.toBe('');
    expect(config.localPath).not.toBe('');
    expect(config.networkPath).not.toBe('');
    expect(config.targetFileName).not.toBe('');
  });

  test('should have correct file extensions in targetFileName', () => {
    expect(config.targetFileName).toMatch(/\.xlsx$/);
  });

  test('should use relative path for localPath', () => {
    expect(config.localPath).toMatch(/^\.\/.+/);
  });
});