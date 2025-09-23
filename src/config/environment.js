const fs = require('fs');
const path = require('path');

/**
 * 环境配置管理器
 * 通过.env文件中的BASE_URL来切换环境
 */
class EnvironmentConfig {
    constructor() {
        this.envConfig = {};
        this.currentEnv = 'development';
        this.loadEnvFile();
        this.loadEnvironmentConfig();
    }

    /**
     * 加载.env文件
     */
    loadEnvFile() {
        try {
            const envPath = path.join(process.cwd(), '.env');
            if (fs.existsSync(envPath)) {
                const envContent = fs.readFileSync(envPath, 'utf8');
                const envLines = envContent.split('\n');

                envLines.forEach(line => {
                    const trimmedLine = line.trim();
                    if (trimmedLine && !trimmedLine.startsWith('#')) {
                        const [key, value] = trimmedLine.split('=');
                        if (key && value) {
                            this.envConfig[key.trim()] = value.trim();
                        }
                    }
                });
            }
        } catch (error) {
            console.warn('加载.env文件失败:', error.message);
        }
    }

    /**
     * 根据BASE_URL加载对应的环境配置
     */
    loadEnvironmentConfig() {
        const baseUrl = this.envConfig.BASE_URL || 'development';
        this.currentEnv = baseUrl;

        try {
            const configPath = path.join(process.cwd(), 'config', 'environments', `${baseUrl}.json`);
            if (fs.existsSync(configPath)) {
                const configContent = fs.readFileSync(configPath, 'utf8');
                this.environmentConfig = JSON.parse(configContent);
            } else {
                console.warn(`环境配置文件不存在: ${configPath}`);
                this.environmentConfig = this.getDefaultConfig(baseUrl);
            }
        } catch (error) {
            console.warn('加载环境配置失败:', error.message);
            this.environmentConfig = this.getDefaultConfig(baseUrl);
        }
    }

    /**
     * 获取默认配置
     */
    getDefaultConfig(env) {
        // 根据环境设置数据库路径
        let databasePath = './data';
        if (env === 'testing') {
            databasePath = './data-test';
        }

        return {
            env,
            name: `${env}环境`,
            baseUrl: env,
            database: {
                type: 'file',
                path: databasePath,
                description: `${env}环境数据库`
            },
            basePath: {
                workspace: './',
                projectStorage: `./storage/${env}`
            },
            api: {
                baseUrl: 'http://localhost:3000',
                timeout: 5000
            },
            logLevel: env === 'production' ? 'info' : 'debug',
            features: {
                hotReload: env !== 'production',
                debugMode: env !== 'production',
                mockData: env !== 'production',
                devTools: env !== 'production'
            }
        };
    }

    /**
     * 获取当前环境配置
     */
    getConfig() {
        return {
            ...this.environmentConfig,
            envVars: this.envConfig
        };
    }

    /**
     * 获取当前环境名称
     */
    getCurrentEnv() {
        return this.currentEnv;
    }

    /**
     * 获取环境变量
     */
    getEnvVar(key, defaultValue = null) {
        return this.envConfig[key] || defaultValue;
    }

    /**
     * 切换环境
     */
    switchEnvironment(env) {
        if (this.currentEnv === env) {
            return;
        }

        // 更新.env文件
        this.envConfig.BASE_URL = env;
        this.saveEnvFile();

        // 重新加载配置
        this.loadEnvironmentConfig();

        console.log(`环境已切换到: ${env}`);
    }

    /**
     * 保存.env文件
     */
    saveEnvFile() {
        try {
            const envPath = path.join(process.cwd(), '.env');
            let envContent = '# 环境配置文件\n# 通过修改 BASE_URL 来切换环境\n\n';

            Object.entries(this.envConfig).forEach(([key, value]) => {
                envContent += `${key}=${value}\n`;
            });

            fs.writeFileSync(envPath, envContent, 'utf8');
        } catch (error) {
            console.error('保存.env文件失败:', error.message);
        }
    }

    /**
     * 获取所有可用环境
     */
    getAvailableEnvironments() {
        try {
            const envDir = path.join(process.cwd(), 'config', 'environments');
            if (fs.existsSync(envDir)) {
                const files = fs.readdirSync(envDir);
                return files
                    .filter(file => file.endsWith('.json'))
                    .map(file => path.basename(file, '.json'));
            }
        } catch (error) {
            console.warn('获取可用环境失败:', error.message);
        }
        return ['development', 'production', 'testing'];
    }
}

// 创建单例实例
const environmentConfig = new EnvironmentConfig();

module.exports = environmentConfig;