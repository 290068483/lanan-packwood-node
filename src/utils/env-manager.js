const fs = require('fs');
const path = require('path');

class EnvironmentManager {
    constructor() {
        this.currentEnv = null;
        this.config = null;
        this.configPath = path.join(__dirname, '../../config');
    }

    /**
     * 加载指定环境的配置
     * @param {string} env - 环境名称 (development, production, testing)
     * @returns {Object} 配置对象
     */
    loadEnvironment(env) {
        const configFilePath = path.join(this.configPath, `${env}.json`);

        if (!fs.existsSync(configFilePath)) {
            throw new Error(`环境配置文件不存在: ${configFilePath}`);
        }

        try {
            const configData = fs.readFileSync(configFilePath, 'utf8');
            this.config = JSON.parse(configData);
            this.currentEnv = env;

            // 设置环境变量
            process.env.NODE_ENV = env;

            console.log(`✅ 已加载${this.config.name}配置`);
            return this.config;
        } catch (error) {
            throw new Error(`加载环境配置失败: ${error.message}`);
        }
    }

    /**
     * 获取当前环境配置
     * @returns {Object} 当前配置
     */
    getCurrentConfig() {
        if (!this.config) {
            throw new Error('未加载任何环境配置，请先调用 loadEnvironment()');
        }
        return this.config;
    }

    /**
     * 获取当前环境名称
     * @returns {string} 环境名称
     */
    getCurrentEnv() {
        return this.currentEnv;
    }

    /**
     * 获取数据库配置
     * @returns {Object} 数据库配置
     */
    getDatabaseConfig() {
        return this.getCurrentConfig().database;
    }

    /**
     * 获取基础路径配置
     * @returns {Object} 基础路径配置
     */
    getBasePathConfig() {
        return this.getCurrentConfig().basePath;
    }

    /**
     * 检查是否为测试环境
     * @returns {boolean}
     */
    isTesting() {
        return this.currentEnv === 'testing';
    }

    /**
     * 检查是否为开发环境
     * @returns {boolean}
     */
    isDevelopment() {
        return this.currentEnv === 'development';
    }

    /**
     * 检查是否为生产环境
     * @returns {boolean}
     */
    isProduction() {
        return this.currentEnv === 'production';
    }

    /**
     * 获取所有可用环境
     * @returns {string[]}
     */
    getAvailableEnvironments() {
        const environments = [];
        const configFiles = fs.readdirSync(this.configPath);

        configFiles.forEach(file => {
            if (file.endsWith('.json')) {
                const envName = file.replace('.json', '');
                environments.push(envName);
            }
        });

        return environments;
    }

    /**
     * 验证配置文件
     * @param {Object} config - 配置对象
     * @returns {boolean}
     */
    validateConfig(config) {
        const requiredFields = ['env', 'name', 'database', 'basePath'];

        for (const field of requiredFields) {
            if (!config[field]) {
                throw new Error(`配置文件缺少必需字段: ${field}`);
            }
        }

        return true;
    }

    /**
     * 切换环境
     * @param {string} newEnv - 新环境名称
     * @returns {Object} 新配置
     */
    switchEnvironment(newEnv) {
        console.log(`🔄 正在从${this.config?.name || '未加载'}切换到${newEnv}环境...`);
        return this.loadEnvironment(newEnv);
    }
}

// 创建单例实例
const envManager = new EnvironmentManager();

module.exports = envManager;