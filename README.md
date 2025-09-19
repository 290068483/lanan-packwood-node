# Pack Node 1.0

一个用于处理定制家具生产数据的综合 Node.js 应用程序，支持 XML 文件生成、Excel 报表生成、数据同步和客户数据归档等功能。

## 项目概述

Pack Node 1.0 是一个专业的家具制造行业数据处理工具，主要用于将复杂的 XML 数据转换为标准格式，并生成相应的 Excel 报表。该系统能够处理多种 XML 结构，自动分组 Cabinet 数据，生成符合行业标准的输出文件。

## 核心功能

### 1. 多格式 XML 解析与生成

- 支持多种 XML 解析器（fast-xml-parser、xml2js、xmldom 等）
- 智能识别不同 XML 结构并自动适配
- 生成符合三维家系统标准的 XML 格式文件
- 支持 Cabinet 和 Panel 数据的正确嵌套结构

### 2. 智能数据处理

- 自动按 Cabinet 分组面板数据
- 支持复杂的嵌套数据结构处理
- 数据完整性检查与验证
- 自动处理属性前缀和命名空间

### 3. Excel 报表生成

- 自动生成包含详细板件信息的 Excel 报表
- 支持已打包数据的高亮显示
- 自动计算板件面积等衍生数据
- 可自定义报表格式和列宽

### 4. 文件输出管理

- 自动创建规范的输出目录结构
- 支持中文字符和特殊符号的文件命名
- 生成完整的 XML 声明和文档结构
- 支持多种文件格式输出（XML、Excel、JSON）

### 5. 数据同步与备份

- 支持网络路径数据同步
- 自动备份功能
- 支持增量同步以提高效率

### 6. 客户数据归档管理

- 客户数据压缩归档功能
- 归档历史记录查看
- 归档数据恢复
- 归档数据导出为 Excel 或 PDF 格式

### 7. 容错处理与日志记录

- 多级解析策略确保处理成功
- 自动修复常见的数据格式问题
- 详细的错误日志记录
- 异常处理和恢复机制

## 技术架构

### 架构设计

本系统采用基于文件系统的架构：

```bash
源XML文件 → 后台服务 → JSON文件系统 → API → 前端界面
```

- **文件系统层**：使用 JSON 文件存储客户数据、归档记录等信息
- **后台服务层**：从源系统读取，解析 XML，更新文件系统，提供高效查询
- **API 层**：提供 REST API 接口处理前端请求
- **前端界面层**：显示状态和进度，处理状态变更

### 核心依赖

- **Node.js**: 运行环境
- **Electron**: 桌面应用支持
- **ExcelJS**: Excel 文件生成
- **fast-xml-parser**: 主要 XML 解析库
- **xml2js**: 备选 XML 解析库
- **xmldom**: XML DOM 操作
- **chalk**: 终端彩色输出
- **chokidar**: 文件监控
- **archiver**: 文件压缩归档
- **unzipper**: 文件解压
- **express**: Web 服务器

### 项目结构

```
pack-node-1.0/
├── src/
│   ├── main.js                 # 主入口文件
│   ├── main-archive.js         # 归档功能IPC处理
│   ├── utils/                  # 工具模块
│   │   ├── xml-generator.js    # XML生成器
│   │   ├── xml-parser.js       # XML解析器
│   │   ├── customer-data-processor.js  # 客户数据处理器
│   │   ├── customer-archive-manager.js # 客户归档管理器
│   │   ├── excel-generator.js  # Excel生成器
│   │   ├── data-sync.js        # 数据同步
│   │   ├── logger.js           # 日志记录
│   │   ├── status-manager.js  # 客户状态管理
│   │   └── ...                 # 其他工具模块
│   ├── database/               # 数据库模块
│   │   ├── connection.js       # 数据库连接
│   │   ├── models/             # 数据模型
│   │   │   └── customer-fs.js  # 客户数据文件系统模型
│   │   └── api.js              # 数据库API接口
│   ├── services/               # 服务模块
│   │   ├── xml-extractor.js    # XML数据提取服务
│   │   ├── data-sync-service.js # 数据同步服务
│   │   └── main-service.js     # 主服务
│   ├── excel/                  # Excel相关模块
│   ├── network/                # 网络同步模块
│   └── ui/                     # 用户界面模块
├── config.json               # 主配置文件
├── config-sync.json          # 数据同步配置文件
├── package.json              # 项目配置
├── tests/                    # 单元测试
│   ├── status-manager.test.js # 状态管理测试
│   ├── server-api.test.js     # API测试
│   └── frontend.test.js       # 前端测试
├── data/                     # 数据库文件目录
└── README.md                 # 项目说明
```

## 安装依赖

```bash
npm install
```

或使用 pnpm:

```bash
pnpm install
```

## 使用方法

### 数据同步服务模式

1. 确保配置文件 `config-sync.json` 已正确设置
2. 启动数据同步服务：
   ```bash
   npm run sync
   ```
   或
   ```bash
   node src/services/main-service.js
   ```
   服务将在后台运行，定期从源路径提取数据并更新数据库。

### 命令行模式

1. 确保配置文件 `config.json` 已正确设置
2. 运行主程序：
   ```bash
   npm start
   ```
   或
   ```bash
   node src/main.js
   ```

### 图形界面模式

```bash
npm run electron
```

## 配置说明

配置文件 `config.json` 包含以下主要配置项：

- `sourcePath`: 源数据路径
- `localPath`: 本地输出路径
- `networkPath`: 网络同步路径
- `autoSave`: 自动保存配置
- `enableNetworkSync`: 网络同步开关

## API 接口

系统提供以下 REST API 接口：

### 客户数据 API

- `GET /api/customers` - 获取所有客户数据
- `GET /api/customers/{name}/details` - 获取客户详细信息
- `GET /api/customers/status/{status}` - 按状态筛选客户

### 客户状态管理 API

- `POST /api/customers/{name}/check-status` - 检查客户状态
- `POST /api/customers/{name}/archive` - 归档客户
- `POST /api/customers/{name}/ship` - 出货
- `POST /api/customers/{name}/mark-not-shipped` - 标记为未出货

### 数据同步 API

- `GET /api/sync/status` - 获取数据同步服务状态

## 输出格式

系统生成的文件包含以下结构：

### XML 文件

- Root 根元素
- Cabinet 节点（包含客户和订单属性）
- Panels 集合
- Panel 元素（包含尺寸、材料、边缘处理等属性）
- LabelInfo、EdgeGroup、Machines 等子元素

### Excel 文件

- 客户信息标题行
- 表头行（标签号、ID 号、方案板号、基材和颜色等 19 列）
- 数据行（每个板件一行）
- 自动计算的面积列
- 已打包数据的灰色背景标记

## 归档功能

系统提供完整的客户数据归档管理功能：

### 归档操作

- 客户数据自动压缩并存储到归档区
- 归档后从工作区移除以节省空间
- 保留完整的归档历史记录

### 归档管理

- 查看归档历史列表
- 查看归档详情（包含包和部件信息）
- 恢复归档数据到工作区
- 导出归档数据为 Excel 或 PDF 格式

## 注意事项

- 确保输入数据路径配置正确
- 系统会自动创建所需的输出目录
- 支持中文字符和特殊符号的文件命名
- 日志文件保存在 logs 目录中

## 单元测试

项目包含完整的单元测试，覆盖主要功能模块：

### 运行测试

```bash
# 运行所有测试
npm test

# 运行特定测试文件
npm test -- --grep "status-manager"

# 生成测试覆盖率报告
npm run test:coverage
```

### 测试覆盖范围

- **状态管理测试** (`tests/status-manager.test.js`): 测试客户状态管理功能
- **API 测试** (`tests/server-api.test.js`): 测试服务器 API 接口
- **前端测试** (`tests/frontend.test.js`): 测试前端界面功能

## 开发说明

项目使用 Git 进行版本控制，包含完整的提交历史。主要功能模块都经过测试，能够稳定运行。

### 开发环境要求

- Node.js >= 18.0.0
- npm 或 pnpm 包管理器
- SQLite3 数据库支持

### 项目启动

```bash
# 开发模式运行
npm run dev

# 电子应用模式运行
npm run electron-dev

# 启动数据同步服务
npm run sync
```

## 贡献

欢迎提交 Issue 和 Pull Request 来改进这个项目。

## 许可证

MIT
