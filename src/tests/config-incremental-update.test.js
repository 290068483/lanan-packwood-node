const fs = require('fs');
const path = require('path');
const { saveConfigWithMerge } = require('../utils/config-manager');

// 测试配置增量更新功能
describe('Config Incremental Update', () => {
    const configPath = path.join(__dirname, '../../config.json');
    let originalConfig;

    // 在测试前备份原始配置
    beforeAll(() => {
        if (fs.existsSync(configPath)) {
            originalConfig = fs.readFileSync(configPath, 'utf8');
        }
    });

    // 测试后恢复原始配置
    afterAll(() => {
        if (originalConfig) {
            fs.writeFileSync(configPath, originalConfig, 'utf8');
        }
    });

    test('should update only specified fields and keep others unchanged', async () => {
        // 创建一个测试配置
        const testConfig = {
            sourcePath: "/test/source/path",
            localPath: "/test/local/path"
        };

        // 保存原始配置内容
        let originalContent = {};
        if (fs.existsSync(configPath)) {
            originalContent = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        }

        // 执行增量更新
        const result = await saveConfigWithMerge(testConfig);

        // 验证结果
        expect(result.success).toBe(true);

        // 读取更新后的配置
        const updatedConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));

        // 验证指定字段已更新
        expect(updatedConfig.sourcePath).toBe("/test/source/path");
        expect(updatedConfig.localPath).toBe("/test/local/path");

        // 验证未指定的字段保持不变
        if (originalContent.networkPath) {
            expect(updatedConfig.networkPath).toBe(originalContent.networkPath);
        }

        // 验证必要的默认字段存在
        expect(updatedConfig.autoSavePath).toBeDefined();
    });

    test('should handle empty config object', async () => {
        const emptyConfig = {};
        const result = await saveConfigWithMerge(emptyConfig);

        expect(result.success).toBe(true);

        const updatedConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        expect(updatedConfig.autoSavePath).toBeDefined();
    });
});