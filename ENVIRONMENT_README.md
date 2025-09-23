# 环境配置管理系统

## 概述

我们重新设计了环境配置管理系统，通过`.env`文件和`baseUrl`机制来简化环境切换和管理。这个新系统比原来的多 JSON 文件配置方式更加简洁和易用。

## 新旧系统对比

### 原系统问题

- 配置文件分散在多个 JSON 文件中
- 环境切换需要手动修改多个文件
- 缺乏统一的环境管理入口
- 配置重复，维护困难

### 新系统优势

- 统一的`.env`文件管理所有环境变量
- 通过修改`BASE_URL`即可切换环境
- 提供命令行工具快速切换环境
- 配置集中管理，易于维护
- 向后兼容原有配置文件

## 文件结构

```
project-root/
├── .env                          # 环境变量配置文件
├── config/
│   ├── environments/            # 环境配置目录
│   │   ├── development.json      # 开发环境配置
│   │   ├── production.json       # 生产环境配置
│   │   └── testing.json         # 测试环境配置
│   └── production.json           # 原有配置文件（保留兼容）
├── src/
│   └── config/
│       ├── environment.js        # 环境配置管理器
│       └── environment-example.js # 使用示例
└── scripts/
    └── switch-env.js            # 环境切换工具
```

## 使用方法

### 1. 基本使用

#### 查看当前环境

```bash
npm run env:current
# 或者
node scripts/switch-env.js --current
```

#### 切换环境

```bash
# 切换到开发环境
npm run env:dev

# 切换到生产环境
npm run env:prod

# 切换到测试环境
npm run env:test
```

#### 查看帮助

```bash
npm run env:help
# 或者
node scripts/switch-env.js --help
```

### 2. 手动修改.env 文件

编辑项目根目录下的`.env`文件：

```env
# 环境配置文件
# 通过修改 BASE_URL 来切换环境

# 基础URL配置 (development/production/testing)
BASE_URL=development

# 数据库配置
DB_TYPE=file
DB_PATH=./data

# API配置
API_BASE_URL=http://localhost:3000
API_TIMEOUT=5000

# 功能开关
ENABLE_NETWORK_SYNC=true
ENABLE_AUTO_SAVE=true
ENABLE_HOT_RELOAD=false
ENABLE_DEBUG_MODE=false
```

### 3. 在代码中使用

```javascript
const environmentConfig = require('./src/config/environment');

// 获取当前环境配置
const config = environmentConfig.getConfig();
console.log('当前环境:', config.env);
console.log('环境名称:', config.name);

// 获取特定环境变量
const dbPath = environmentConfig.getEnvVar('DB_PATH');
const logLevel = environmentConfig.getEnvVar('LOG_LEVEL');

// 获取当前环境名称
const currentEnv = environmentConfig.getCurrentEnv();

// 条件判断
if (currentEnv === 'development') {
  // 开发环境逻辑
} else if (currentEnv === 'production') {
  // 生产环境逻辑
}

// 切换环境（程序化）
environmentConfig.switchEnvironment('production');
```

## 环境配置说明

### 开发环境 (development)

- **用途**: 日常开发调试
- **数据库**: `./data-dev`
- **日志级别**: `debug`
- **功能**: 启用热重载、调试模式、模拟数据
- **网络同步**: 禁用

### 生产环境 (production)

- **用途**: 正式生产环境
- **数据库**: `../data`
- **日志级别**: `info`
- **功能**: 禁用热重载、调试模式、模拟数据
- **网络同步**: 启用

### 测试环境 (testing)

- **用途**: 功能测试和集成测试
- **数据库**: `../data-test`
- **日志级别**: `debug`
- **功能**: 启用热重载、调试模式、模拟数据
- **网络同步**: 禁用
- **特殊功能**: 包含完整测试数据

## API 参考

### EnvironmentConfig 类

#### 方法

- `getConfig()`: 获取当前环境完整配置
- `getCurrentEnv()`: 获取当前环境名称
- `getEnvVar(key, defaultValue)`: 获取特定环境变量
- `switchEnvironment(env)`: 切换环境
- `getAvailableEnvironments()`: 获取所有可用环境

#### 示例

```javascript
const environmentConfig = require('./src/config/environment');

// 获取完整配置
const config = environmentConfig.getConfig();

// 获取环境变量
const apiBaseUrl = environmentConfig.getEnvVar(
  'API_BASE_URL',
  'http://localhost:3000'
);

// 切换环境
environmentConfig.switchEnvironment('production');

// 获取可用环境
const envs = environmentConfig.getAvailableEnvironments();
console.log('可用环境:', envs);
```

## 迁移指南

### 从旧系统迁移

1. **备份原有配置文件**

   ```bash
   cp config/production.json config/production.json.backup
   cp config/testing.json config/testing.json.backup
   ```

2. **使用新系统**

   ```bash
   # 切换到生产环境
   npm run env:prod

   # 切换到测试环境
   npm run env:test

   # 切换到开发环境
   npm run env:dev
   ```

3. **更新代码引用**

   ```javascript
   // 旧方式
   const config = require('./config/production.json');

   // 新方式
   const environmentConfig = require('./src/config/environment');
   const config = environmentConfig.getConfig();
   ```

### 自定义环境

1. **创建环境配置文件**

   ```bash
   # 创建staging环境
   cp config/environments/production.json config/environments/staging.json
   ```

2. **编辑配置文件**

   ```json
   {
     "env": "staging",
     "name": "预发布环境",
     "baseUrl": "staging",
     "database": {
       "type": "file",
       "path": "./data-staging",
       "description": "预发布环境数据库"
     }
   }
   ```

3. **切换到新环境**
   ```bash
   node scripts/switch-env.js staging
   ```

## 最佳实践

### 1. 环境隔离

- 每个环境使用独立的数据库目录
- 不同环境的文件路径要明确区分
- 生产环境的敏感信息不要提交到版本控制

### 2. 配置管理

- 使用`.env.example`作为模板
- 将`.env`添加到`.gitignore`
- 敏感信息使用环境变量，不要硬编码

### 3. 开发流程

```bash
# 开发新功能
npm run env:dev
npm run dev

# 测试功能
npm run env:test
npm run test:ui

# 部署到生产
npm run env:prod
npm run prod
```

### 4. 错误处理

```javascript
try {
  const environmentConfig = require('./src/config/environment');
  const config = environmentConfig.getConfig();

  if (!config.database.path) {
    throw new Error('数据库路径未配置');
  }

  // 使用配置
} catch (error) {
  console.error('环境配置加载失败:', error.message);
  // 使用默认配置或退出程序
}
```

## 故障排除

### 常见问题

1. **环境配置文件不存在**

   ```bash
   # 检查文件是否存在
   ls -la config/environments/

   # 重新创建默认配置
   node scripts/switch-env.js development
   ```

2. **.env 文件权限问题**

   ```bash
   # 检查文件权限
   ls -la .env

   # 修复权限
   chmod 644 .env
   ```

3. **环境变量未生效**

   ```bash
   # 重启应用
   npm run dev

   # 检查当前环境
   npm run env:current
   ```

### 调试方法

```javascript
// 启用调试模式
const environmentConfig = require('./src/config/environment');
const config = environmentConfig.getConfig();

console.log('完整配置:', JSON.stringify(config, null, 2));
console.log('环境变量:', config.envVars);
console.log('当前环境:', environmentConfig.getCurrentEnv());
console.log('可用环境:', environmentConfig.getAvailableEnvironments());
```

## 总结

新的环境配置管理系统提供了以下改进：

1. **简化配置**: 通过`.env`文件统一管理环境变量
2. **快速切换**: 命令行工具支持快速环境切换
3. **向后兼容**: 保持与原有配置文件的兼容性
4. **易于维护**: 集中管理，减少重复配置
5. **灵活扩展**: 支持自定义环境和配置

这个系统让环境管理变得更加简单和高效，大大提升了开发和部署的便利性。
