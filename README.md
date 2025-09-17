# Pack Node 1.0

一个用于处理定制家具生产数据的综合 Node.js 应用程序，支持 XML 文件生成、Excel 报表生成和数据同步等功能。

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
- 定时清理过期数据
- 支持增量同步以提高效率

### 6. 容错处理与日志记录

- 多级解析策略确保处理成功
- 自动修复常见的数据格式问题
- 详细的错误日志记录
- 异常处理和恢复机制

## 技术架构

### 核心依赖

- **Node.js**: 运行环境
- **Electron**: 桌面应用支持
- **ExcelJS**: Excel 文件生成
- **fast-xml-parser**: 主要 XML 解析库
- **xml2js**: 备选 XML 解析库
- **xmldom**: XML DOM 操作
- **chalk**: 终端彩色输出

### 项目结构

```
pack-node-1.0/
├── src/
│   ├── main.js                 # 主入口文件
│   ├── utils/                  # 工具模块
│   │   ├── xml-generator.js    # XML生成器
│   │   ├── xml-parser.js       # XML解析器
│   │   ├── customer-data-processor.js  # 客户数据处理器
│   │   ├── excel-generator.js  # Excel生成器
│   │   ├── data-sync.js        # 数据同步
│   │   ├── logger.js           # 日志记录
│   │   └── ...                 # 其他工具模块
│   ├── excel/                  # Excel相关模块
│   ├── network/                # 网络同步模块
│   └── ui/                     # 用户界面模块
├── config.json               # 配置文件
├── package.json              # 项目配置
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
- 表头行（标签号、ID号、方案板号、基材和颜色等19列）
- 数据行（每个板件一行）
- 自动计算的面积列
- 已打包数据的灰色背景标记

## 注意事项

- 确保输入数据路径配置正确
- 系统会自动创建所需的输出目录
- 支持中文字符和特殊符号的文件命名
- 日志文件保存在 logs 目录中

## 开发说明

项目使用 Git 进行版本控制，包含完整的提交历史。主要功能模块都经过测试，能够稳定运行。

### 开发环境要求
- Node.js >= 18.0.0
- npm 或 pnpm 包管理器

### 项目启动
```bash
# 开发模式运行
npm run dev

# 电子应用模式运行
npm run electron-dev
```

## 贡献

欢迎提交 Issue 和 Pull Request 来改进这个项目。

## 许可证

MIT