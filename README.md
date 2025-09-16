# Pack Node 1.0

一个用于生成定制家具面板 XML 文件的 Node.js 应用程序。

## 项目概述

Pack Node 1.0 是一个专门用于从 JSON 数据生成标准 XML 格式文件的工具，特别适用于家具制造行业的定制面板数据转换。项目能够处理复杂的嵌套数据结构，生成符合行业标准的 XML 文件。

## 核心功能

### 1. XML 文件生成

- 从 JSON 数据文件生成标准 XML 格式
- 支持定制家具面板数据转换
- 自动处理文件名中的特殊字符
- 支持多种 XML 解析器（fast-xml-parser 和 xml2js）

### 2. 智能数据处理

- 自动按 Cabinet 分组面板数据
- 支持复杂的嵌套数据结构
- 自动处理属性前缀和命名空间

### 3. 文件输出管理

- 自动创建输出目录结构
- 支持中文字符和特殊符号的文件命名
- 生成完整的 XML 声明和文档结构

### 4. 容错处理

- 多级解析策略确保生成成功
- 自动修复常见的数据格式问题
- 详细的错误日志记录

## 技术架构

### 核心依赖

- **fast-xml-parser**: 主要 XML 生成库
- **xml2js**: 备选 XML 生成库
- **Node.js fs 模块**: 文件系统操作

### 项目结构

```
pack-node-1.0/
├── generate-real-xml.js    # 主生成脚本
├── temp-xml-generator.js   # XML生成器模块
└── README.md             # 项目说明
```

## 安装依赖

```bash
npm install fast-xml-parser xml2js
```

## 使用方法

1. 准备数据文件：将`packages.json`文件放置在项目根目录
2. 运行生成脚本：
   ```bash
   node generate-real-xml.js
   ```

## 输出格式

生成的 XML 文件包含以下结构：

- Root 根元素
- Cabinet 节点（包含客户和订单属性）
- Panels 集合
- Panel 元素（包含尺寸、材料、边缘处理等属性）
- LabelInfo、EdgeGroup、Machines 等子元素

## 注意事项

- 确保输入数据文件`packages.json`存在
- 文件名中的特殊字符会自动处理
- 支持中文字符和特殊符号的文件命名

## 开发说明

项目使用 Git 进行版本控制，包含完整的提交历史。主要功能模块已经过测试，能够正确生成符合标准的 XML 格式文件。

## 贡献

欢迎提交 Issue 和 Pull Request 来改进这个项目。

## 许可证

MIT
