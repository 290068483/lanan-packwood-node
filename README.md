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