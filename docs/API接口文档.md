# Pack Node API 接口文档

## 概述

Pack Node 提供了丰富的 API 接口，允许开发者和第三方系统与应用程序进行交互。这些接口包括客户数据管理、状态更新、系统控制等功能。

## 基础信息

- **协议**: HTTP
- **编码**: UTF-8
- **数据格式**: JSON

## API 列表

### 1. 客户数据接口

#### 获取所有客户

```
GET /api/customers
```

**说明**: 获取系统中的所有客户数据

**请求参数**: 无

**响应示例**:

```json
[
  {
    "id": 1,
    "name": "客户名称",
    "status": "已打包",
    "packProgress": 100,
    "packedCount": 50,
    "totalParts": 50,
    "packSeqs": ["001", "002"],
    "lastUpdate": "2023-01-01T12:00:00Z"
  }
]
```

#### 添加客户

```
POST /api/customers
```

**说明**: 添加新客户到系统

**请求参数**:

```json
{
  "name": "客户名称",
  "status": "未打包"
}
```

**响应示例**:

```json
{
  "success": true
}
```

### 2. 客户状态管理接口

#### 更新客户状态

```
PUT /api/customer/{customerName}
```

**说明**: 更新指定客户的当前状态

**请求参数**:

```json
{
  "status": "已打包",
  "remark": "备注信息"
}
```

**响应示例**:

```json
{
  "success": true
}
```

#### 检查客户状态

```
POST /api/customers/{id}/check-status
```

**说明**: 检查并更新指定客户的打包状态

**请求参数**: 无

**响应示例**:

```json
{
  "success": true,
  "message": "状态检查完成"
}
```

#### 归档客户数据

```
POST /api/customers/{name}/archive
```

**说明**: 将指定客户的已打包数据进行归档处理

**请求参数**:

```json
{
  "operator": "操作员",
  "remark": "归档备注"
}
```

**响应示例**:

```json
{
  "success": true,
  "message": "客户已成功归档"
}
```

#### 标记客户为已出货

```
POST /api/customers/{name}/ship
```

**说明**: 将指定客户的归档数据标记为已出货状态

**请求参数**:

```json
{
  "remark": "出货备注"
}
```

**响应示例**:

```json
{
  "success": true,
  "status": "已出货",
  "shipmentDate": "2023-01-01T10:00:00.000Z",
  "message": "客户状态已更新为已出货"
}
```

#### 标记客户为部分出货

```
POST /api/customers/{name}/partial-ship
```

**说明**: 将指定客户的归档数据标记为部分出货状态

**请求参数**:

```json
{
  "remark": "部分出货备注"
}
```

**响应示例**:

```json
{
  "success": true,
  "status": "部分出货",
  "shipmentDate": "2023-01-01T10:00:00.000Z",
  "message": "客户状态已更新为部分出货"
}
```

#### 标记客户为未出货

```
POST /api/customers/{name}/mark-not-shipped
```

**说明**: 将指定客户的归档数据标记为未出货状态

**请求参数**:

```json
{
  "remark": "未出货备注"
}
```

**响应示例**:

```json
{
  "success": true,
  "status": "未出货",
  "message": "客户状态已更新为未出货"
}
```

### 3. 系统控制接口

#### 运行主程序

```
POST /api/run
```

**说明**: 启动主数据处理程序

**请求参数**: 无

**响应示例**:

```json
{
  "success": true,
  "message": "程序开始运行"
}
```

#### 停止运行

```
POST /api/stop
```

**说明**: 停止正在运行的主程序

**请求参数**: 无

**响应示例**:

```json
{
  "success": true,
  "message": "程序已停止"
}
```

#### 获取运行状态

```
GET /api/status
```

**说明**: 获取主程序的当前运行状态

**请求参数**: 无

**响应示例**:

```json
{
  "running": false
}
```

### 4. 配置管理接口

#### 获取配置

```
GET /api/config
```

**说明**: 获取当前系统配置

**请求参数**: 无

**响应示例**:

```json
{
  "sourcePath": "C:/source",
  "localPath": "C:/output",
  "networkPath": "//network/path"
}
```

#### 更新配置

```
POST /api/config
```

**说明**: 更新系统配置

**请求参数**:

```json
{
  "sourcePath": "C:/new/source",
  "localPath": "C:/new/output"
}
```

**响应示例**:

```json
{
  "success": true,
  "message": "配置已更新"
}
```

### 5. 归档数据管理接口（IPC 接口）

以下接口通过 Electron IPC 机制提供，主要用于前端界面与主进程通信：

#### 获取归档列表

```
ipcRenderer.invoke('get-archive-list', page, pageSize)
```

**说明**: 获取归档数据列表，支持分页

**参数**:

- `page`: 页码（默认 1）
- `pageSize`: 每页数量（默认 20）

**响应示例**:

```json
{
  "success": true,
  "data": [...],
  "total": 100,
  "page": 1,
  "pageSize": 20
}
```

#### 获取归档详情

```
ipcRenderer.invoke('get-archive-detail', archiveId)
```

**说明**: 获取指定归档记录的详细信息

**参数**:

- `archiveId`: 归档记录 ID

**响应示例**:

```json
{
  "success": true,
  "data": {
    "id": 1,
    "customer_name": "客户名称",
    "archive_date": "2023-01-01T12:00:00Z",
    "packages_count": 5,
    "total_parts_count": 50
  }
}
```

#### 恢复归档

```
ipcRenderer.invoke('restore-archive', archiveId)
```

**说明**: 将指定归档数据恢复到工作区

**参数**:

- `archiveId`: 归档记录 ID

**响应示例**:

```json
{
  "success": true,
  "message": "归档已成功恢复"
}
```

#### 导出归档到 Excel

```
ipcRenderer.invoke('export-archive-to-excel', archiveId)
```

**说明**: 将指定归档数据导出为 Excel 文件

**参数**:

- `archiveId`: 归档记录 ID

**响应示例**:

```json
{
  "success": true,
  "filePath": "C:/export/file.xlsx",
  "message": "归档已导出到: C:/export/file.xlsx"
}
```

#### 导出归档到 PDF

```
ipcRenderer.invoke('export-archive-to-pdf', archiveId)
```

**说明**: 将指定归档数据导出为 PDF 文件

**参数**:

- `archiveId`: 归档记录 ID

**响应示例**:

```json
{
  "success": true,
  "filePath": "C:/export/file.pdf",
  "message": "归档已导出到: C:/export/file.pdf"
}
```

## 状态码说明

| 状态码 | 说明           |
| ------ | -------------- |
| 200    | 请求成功       |
| 400    | 请求参数错误   |
| 404    | 资源未找到     |
| 500    | 服务器内部错误 |

## 错误响应格式

```json
{
  "error": "错误描述信息"
}
```

## 客户状态说明

系统中的客户可能处于以下几种状态之一：

1. **未打包 (UNPACKED)** - 客户数据已导入但尚未开始打包
2. **正在处理 (PROCESSING)** - 客户数据正在打包过程中
3. **已打包 (PACKED)** - 客户数据已完成打包
4. **已归档 (ARCHIVED)** - 已打包的客户数据已被归档保存
5. **已出货 (SHIPPED)** - 已归档的客户货物已全部出货
6. **部分出货 (PARTIAL_SHIPPED)** - 已归档的客户货物部分出货
7. **未出货 (NOT_SHIPPED)** - 已归档的客户货物尚未出货

## 使用示例

### 获取所有客户数据

```bash
curl -X GET http://localhost:3000/api/customers
```

### 更新客户状态

```bash
curl -X PUT http://localhost:3000/api/customer/客户名称 \
  -H "Content-Type: application/json" \
  -d '{"status": "已打包", "remark": "通过API更新"}'
```

### 运行主程序

```bash
curl -X POST http://localhost:3000/api/run
```
