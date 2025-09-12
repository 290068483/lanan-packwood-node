# XML Parser Optimizer

一个优化的XML解析器，用于处理复杂的XML文件并生成Excel报表。

## 项目概述

XML Parser Optimizer是一个专门用于处理复杂XML文件的工具，它能够解析XML数据并生成结构化的Excel报表。该项目特别适用于处理包含大量嵌套结构和复杂数据的XML文件，如家具制造行业的生产数据文件。

## 核心功能

### 1. 多层XML解析策略
项目采用多层解析策略，确保能够处理各种格式的XML文件：
1. **首选方案**：使用fast-xml-parser最宽松配置解析整个XML文件
2. **备选方案1**：如果首选方案失败，尝试其他解析器（xml2js, xmldom, libxmljs2）
3. **备选方案2**：如果所有解析器都失败，尝试修复XML数据后再次使用首选方案，如果首选方案失败，尝试其他解析器
4. **备选方案3**：如果修复后仍失败，尝试分段解析（按Cabinet节点分割）
5. **备选方案4**：如果分段解析也失败，直接提取关键节点（Panels和Panel）
6. **最终方案**：如果以上方案都失败，记录详细错误日志并跳过该文件

### 2. 智能数据打包
- 自动检测package.json变化
- 只有当package.json真正发生变化时才标记数据为已打包
- 空的或默认的package.json不会触发打包标记

### 3. Excel报表生成
- 生成包含详细板件信息的Excel报表
- 支持多种样式设置（标题、表头、数据行等）
- 自动计算面积等派生字段

### 4. 网络同步功能
- 支持将生成的Excel文件同步到网络路径
- 按日期和客户名称创建目标文件夹
- 支持数据分类（已打包数据和剩余数据）

### 5. XML诊断工具
- 提供专门的XML文件诊断工具
- 检测XML文件的编码、格式、结构等问题
- 生成详细的诊断报告帮助定位问题

## 技术架构

### 核心依赖
- **fast-xml-parser**: 主要XML解析库
- **xml2js**: 备选XML解析库
- **xmldom**: 备选XML解析库
- **libxmljs2**: 备选XML解析库
- **exceljs**: Excel文件生成库

### 项目结构
```
src/
├── excel/
│   └── generate-excel-auto-lines.js  # 主要处理逻辑
├── xml/
│   ├── xml-diagnostics.js            # XML诊断工具
│   ├── diagnose-xml.js               # XML诊断命令行工具
│   └── check-xml-content.js          # XML内容检查工具
├── tests/                            # 测试文件
│   ├── integration.test.js           # 集成测试
│   ├── functional.test.js            # 功能测试
│   └── ...                           # 其他单元测试
├── local/                            # 本地输出目录
└── utils/                            # 工具函数

```

## 安装与使用

### 安装依赖
```bash
npm install
```

### 运行项目
```bash
npm run dev
```

### 运行测试
```bash
# 运行所有测试
npm test

# 运行集成测试
npm run test-integration

# 运行功能测试
npm run test-functional

# 运行多产线数据处理测试
npm run test-multiline

# 检查XML内容
npm run check

# 诊断XML文件问题
npm run diagnose <xml_file_path>
```

### 使用XML诊断工具
XML诊断工具可以帮助您识别XML文件中的问题：

```bash
# 诊断特定XML文件
npm run diagnose "path/to/your/xmlfile.xml"

# 示例
npm run diagnose "C:\data\优化文件.xml"
```

诊断工具会检查以下方面：
- 文件完整性
- 基础XML格式
- 编码问题
- 结构验证

## 故障排除

如果遇到XML解析失败问题，请使用诊断工具分析XML文件：

1. 运行诊断工具：
   ```bash
   npm run diagnose "path/to/problematic/file.xml"
   ```

2. 根据诊断报告中的问题类型采取相应措施：
   - **编码问题**：确保文件使用UTF-8编码
   - **格式问题**：检查XML标签是否正确闭合，属性是否正确引用
   - **结构问题**：确保包含必要的节点（Root, Cabinet, Panels, Panel）

3. 如果问题仍然存在，请提供诊断报告给技术支持团队。

## 贡献

欢迎提交Issue和Pull Request来改进这个项目。

## 许可证

MIT

# XML 处理工具配置

这个项目包含用于验证和处理XML文件的工具配置。

## 配置文件

项目使用 [config.json](file:///C:/Users/Administrator/Desktop/test/config.json) 配置文件来指定数据源路径和输出路径：

```json
{
  "sourcePath": "C:\\Users\\Administrator\\Desktop\\打包数据源的数据",
  "localPath": "E:\\res\\pack-node\\local",
  "networkPath": "\\\\c1\\mpm\\temp\\local",
  "targetFileName": "板件明细.xlsx",
  "enableNetworkSync": false
}
```

配置项说明：
- `sourcePath`: 要读取的目标源数据目录
- `localPath`: 生成的数据存放目录
- `networkPath`: 网络同步路径（暂未使用）
- `targetFileName`: 生成的Excel文件名模板
- `enableNetworkSync`: 是否启用网络同步（暂未使用）

## 已安装的工具

1. **ESLint**: JavaScript代码检查工具
2. **fast-xml-parser**: 用于解析和验证XML文件的Node.js库
3. **Jest**: JavaScript测试框架
4. **xlsx**: 用于生成Excel文件的Node.js库
5. **exceljs**: 用于生成带样式的Excel文件的Node.js库

## 使用方法

### 运行测试

运行单元测试：

```bash
npm test
```

### 运行集成测试

运行多产线数据处理的集成测试：

```bash
npm run test-multiline
```

### 启动项目

处理客户目录下的所有产线XML文件并生成Excel报表：

```bash
npm run dev
```

### 检查XML标签

检查XML文件中的中文字符和潜在问题：

```bash
npm run check
```

## 脚本说明

- [src/xml/validate-xml.js](file:///C:/Users/Administrator/Desktop/test/src/xml/validate-xml.js) - 用于验证XML文件基本格式的脚本
- [src/xml/compare-xml.js](file:///C:/Users/Administrator/Desktop/test/src/xml/compare-xml.js) - 比较两个XML文件是否相同的脚本
- [src/xml/analyze-xml.js](file:///C:/Users/Administrator/Desktop/test/src/xml/analyze-xml.js) - 分析XML文件结构和内容的脚本
- [src/xml/validate-xml-advanced.js](file:///C:/Users/Administrator/Desktop/test/src/xml/validate-xml-advanced.js) - 使用fast-xml-parser进行高级XML验证的脚本
- [src/xml/check-xml-content.js](file:///C:/Users/Administrator/Desktop/test/src/xml/check-xml-content.js) - 检查XML文件内容中潜在问题的脚本
- [src/excel/generate-excel.js](file:///C:/Users/Administrator/Desktop/test/src/excel/generate-excel.js) - 将XML数据转换为Excel表格的脚本
- [src/excel/generate-excel-enhanced.js](file:///C:/Users/Administrator/Desktop/test/src/excel/generate-excel-enhanced.js) - 将XML数据转换为带样式的Excel表格的脚本
- [src/excel/generate-excel-auto-lines.js](file:///C:/Users/Administrator/Desktop/test/src/excel/generate-excel-auto-lines.js) - 自动检测产线并合并生成Excel表格的脚本
- [src/utils/xml-utils.js](file:///C:/Users/Administrator/Desktop/test/src/utils/xml-utils.js) - XML处理工具函数
- [.eslintrc.js](file:///C:/Users/Administrator/Desktop/test/.eslintrc.js) - ESLint配置文件

## 测试

项目包含以下测试文件：
- [src/tests/xml-utils.test.js](file:///C:/Users/Administrator/Desktop/test/src/tests/xml-utils.test.js) - 基本XML处理函数测试
- [src/tests/xml-chinese.test.js](file:///C:/Users/Administrator/Desktop/test/src/tests/xml-chinese.test.js) - 中文内容和格式测试
- [src/tests/generate-excel.test.js](file:///C:/Users/Administrator/Desktop/test/src/tests/generate-excel.test.js) - Excel生成功能测试
- [src/tests/generate-excel-enhanced.test.js](file:///C:/Users/Administrator/Desktop/test/src/tests/generate-excel-enhanced.test.js) - 增强版Excel生成功能测试

查看详细的测试报告: [TEST_REPORT.md](file:///C:/Users/Administrator/Desktop/test/TEST_REPORT.md)

## XML文件信息

项目中的 [优化文件.xml](file:///C:/Users/Administrator/Desktop/test/%E4%BC%98%E5%8C%96%E6%96%87%E4%BB%B6.xml) 和 [优化文件2.xml](file:///C:/Users/Administrator/Desktop/test/%E4%BC%98%E5%8C%96%E6%96%87%E4%BB%B62.xml) 是家具制造相关的数据文件，包含大量中文描述信息。

## 生成的Excel文件

运行 `npm run dev` 后，会自动生成Excel文件，其中包含从XML数据中提取的板件明细信息。该表格包括以下列：

- 标签号
- ID号
- 方案板号
- 基材和颜色
- 柜体名
- 板件名
- 类型
- 高
- 宽
- 厚
- 面积
- 纹理
- 封边
- 孔
- 槽铣
- 拉直
- 门向
- 门铰孔
- 备注

### 数据提取说明

在处理XML文件时，我们发现实际的属性名称与预期不同。通过分析XML结构，我们建立了正确的属性映射关系：

- 标签号: `@_CabinetPanelNo`
- ID号: `@_Uid` 的后5位字符
- 方案板号: `@_PartNumber`
- 基材和颜色: `@_BasicMaterial` 和 `@_Material` 组合（格式：基材/颜色）
- 柜体名: `@_GroupName` 或 `@_Name`（来自上层Cabinet节点）
- 板件名: `@_Name`
- 类型: `@_Type`
- 高: `@_Width`
- 宽: `@_Length`
- 厚: `@_Thickness`
- 面积: 通过计算长*宽得到
- 纹理: `@_Grain`
- 封边: `@_EdgeGroupTypeName`
- 孔: `@_HasHorizontalHole`

某些字段（如槽铣、拉直、门铰孔、备注）在XML数据中未找到对应的属性，因此在Excel表格中留空。

### 数据结构对应关系

- 每个XML中的Panel节点对应Excel表格中的一行数据
- 柜体名信息存储在上层Cabinet节点中，需要正确关联

### 基材和颜色组合

在生成的Excel表格中，"基材和颜色"列的数据格式为"基材/颜色"，其中：
- 基材数据来自XML中的 `@_BasicMaterial` 属性
- 颜色数据来自XML中的 `@_Material` 属性
- 两者通过"/"字符连接，形成"基材/颜色"的格式

例如：
- "T系列/浮生晓月-黑"
- "福人精板/L8084"
- "OSB_K系/金朝"

### 增强版Excel表格

我们还提供了一个增强版的Excel生成功能，通过运行 `npm run dev` 命令可以生成一个具有样式的Excel文件。该文件具有以下改进：

1. **标题行**：包含"客户名 - 板件明细"格式的标题
2. **样式优化**：
   - 标题行居中显示，字体更大更粗
   - 表头行具有灰色背景色
   - 所有数据行垂直居中对齐
3. **对齐方式优化**：
   - 标题行和表头行水平居中对齐
   - 数据行水平左对齐
4. **中文柜体名**：正确显示中文柜体名而非英文标识
5. **正确的ID号**：使用Uid属性的后5位作为ID号
6. **列宽优化**：根据内容自动调整列宽
7. **合并单元格**：标题行跨所有列合并

增强版Excel文件更接近您提供的图片样式，具有更好的视觉效果和专业外观。

### 自动检测产线并合并生成Excel表格

我们提供了一个智能脚本，可以自动检测客户目录下的所有产线并合并生成Excel表格。通过运行 `npm run dev` 或 `npm run test-multiline` 命令可以实现以下功能：

1. **自动产线检测**：自动扫描客户目录下的所有产线子目录
2. **智能文件查找**：在每个产线目录中自动查找优化文件.xml
3. **数据合并**：将来自不同产线的数据合并到一个Excel表格中
4. **容错处理**：对不存在或格式不正确的XML文件进行容错处理
5. **客户名识别**：从XML文件中自动提取客户名称用于表格标题
6. **完整数据处理**：保持与其他生成功能相同的数据处理和样式优化
7. **自动输出目录**：将生成的Excel文件保存到配置文件指定的本地目录中
8. **时间戳命名**：输出文件名包含生成日期时间戳，便于版本管理

这个功能解决了需要手动运行脚本来处理多个产线数据的问题，实现了完全自动化处理。