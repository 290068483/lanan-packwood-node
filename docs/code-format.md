# 代码格式规范文档

## 1. 文件结构规范

### 1.1 文件大小限制

- 单文件代码行数不应超过 10,000 行
- 建议单个文件保持在 500-2,000 行之间
- 超过限制的文件应按功能模块拆分为更小的文件

### 1.2 文件命名规范

- 使用小写字母和连字符（kebab-case）
- 例如：`customer-status-manager.js`、`api-handler.js`
- 组件文件使用 PascalCase：`CustomerList.js`

### 1.3 文件组织结构

```
src/
├── api/              # API 接口文件
├── components/       # React 组件
├── utils/           # 工具函数
├── services/        # 业务逻辑服务
├── constants/       # 常量定义
├── styles/          # 样式文件
└── types/           # TypeScript 类型定义
```

## 2. 函数规范

### 2.1 函数大小限制

- 单个函数代码行数不应超过 300 行
- 建议函数保持在 20-80 行之间
- 超过限制的函数应拆分为多个小函数

### 2.2 函数命名规范

- 使用动词开头，描述函数功能
- 使用驼峰命名法（camelCase）
- 例如：`getCustomerData()`、`updateStatus()`、`calculateProgress()`

### 2.3 函数参数规范

- 参数数量不应超过 5 个
- 超过 5 个参数应使用对象参数
- 例如：`processData(options)` 而不是 `processData(a, b, c, d, e, f)`

### 2.4 函数返回值规范

- 函数应有明确的返回值
- 避免使用隐式返回
- 异步函数应返回 Promise

## 3. 代码风格规范

### 3.1 缩进和空格

- 使用 2 个空格进行缩进
- 不使用制表符（Tab）
- 运算符前后应有空格

### 3.2 命名规范

- 变量：使用驼峰命名法（camelCase）
- 常量：使用大写字母和下划线（UPPER_SNAKE_CASE）
- 类：使用 PascalCase
- 私有属性：使用下划线前缀（\_privateProperty）

### 3.3 注释规范

- 使用 JSDoc 格式为函数添加注释
- 关键逻辑应添加行内注释
- 注释应解释为什么，而不是做什么

```javascript
/**
 * 计算客户打包进度
 * @param {Object} customer - 客户数据对象
 * @param {Array} packages - 包裹数据数组
 * @returns {number} 打包进度百分比
 */
function calculatePackProgress(customer, packages) {
  // 计算已打包的板件数量
  const packedCount = packages.filter(
    pkg => pkg.customerId === customer.id
  ).length;

  // 计算总板件数量
  const totalCount = customer.totalParts || 0;

  // 避免除零错误
  if (totalCount === 0) return 0;

  return Math.round((packedCount / totalCount) * 100);
}
```

## 4. 错误处理规范

### 4.1 错误处理原则

- 使用 try-catch 捕获可能的异常
- 提供有意义的错误信息
- 记录错误日志
- 优雅地处理错误情况

### 4.2 错误处理示例

```javascript
async function processCustomerData(customerId) {
  try {
    const customer = await getCustomer(customerId);
    if (!customer) {
      throw new Error(`客户 ${customerId} 不存在`);
    }

    const result = await updateCustomerStatus(customer);
    return result;
  } catch (error) {
    console.error('处理客户数据失败:', error);
    throw new Error(`处理客户数据失败: ${error.message}`);
  }
}
```

## 5. 性能优化规范

### 5.1 代码优化原则

- 避免重复计算
- 使用缓存机制
- 优化循环和递归
- 减少不必要的变量声明

### 5.2 异步处理规范

- 使用 async/await 处理异步操作
- 避免回调地狱
- 合理使用 Promise.all() 并行处理

### 5.3 内存管理规范

- 及时释放不再使用的资源
- 避免内存泄漏
- 使用弱引用（WeakMap、WeakSet）处理大型对象

## 6. 测试规范

### 6.1 测试文件命名

- 测试文件应与源文件同名，添加 `.test.js` 或 `.spec.js` 后缀
- 例如：`customer-manager.test.js`

### 6.2 测试覆盖率

- 单元测试覆盖率应不低于 80%
- 关键业务逻辑应有 100% 覆盖率
- 集成测试应覆盖主要业务流程

### 6.3 测试用例规范

```javascript
describe('CustomerStatusManager', () => {
  describe('calculatePackProgress', () => {
    it('应该正确计算打包进度', () => {
      const customer = { id: 'test', totalParts: 100 };
      const packages = [
        { customerId: 'test', partId: '1' },
        { customerId: 'test', partId: '2' },
      ];

      const progress = calculatePackProgress(customer, packages);
      expect(progress).toBe(2);
    });

    it('应该处理零除情况', () => {
      const customer = { id: 'test', totalParts: 0 };
      const packages = [];

      const progress = calculatePackProgress(customer, packages);
      expect(progress).toBe(0);
    });
  });
});
```

## 7. 版本控制规范

### 7.1 Git 提交信息

- 使用语义化提交信息
- 格式：`<类型>: <描述>`
- 类型：feat（功能）、fix（修复）、docs（文档）、style（格式）、refactor（重构）、test（测试）、chore（构建）

### 7.2 分支管理

- 主分支：main（生产环境）
- 开发分支：develop（开发环境）
- 功能分支：feature/功能名称
- 修复分支：fix/问题描述

## 8. 安全规范

### 8.1 输入验证

- 所有用户输入都应进行验证
- 使用正则表达式验证格式
- 避免直接使用用户输入

### 8.2 数据安全

- 敏感数据不应记录在日志中
- 使用 HTTPS 传输数据
- 定期更新依赖包

### 8.3 代码安全

- 避免使用 eval() 函数
- 使用参数化查询防止 SQL 注入
- 定期进行安全审计 测试文件放到 tests 目录下

## 临时测试文件和数据 放到 temp-tests 目录下

## 临时测试 完成工作后需要删除。
