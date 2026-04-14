# 附录：Prisma 常见错误码速查

> 记录 Prisma `PrismaClientKnownRequestError` 中常用的错误码，以及如何在全局错误处理中间件中将其转换为友好的 API 响应。

---

## 什么是 PrismaClientKnownRequestError？

当 Prisma Client 与数据库交互时，如果数据库返回了一个 Prisma 能识别的错误条件，就会抛出 `Prisma.PrismaClientKnownRequestError`。它有两个关键属性：

| 属性 | 类型 | 说明 |
|------|------|------|
| `code` | `string` | 错误码，以 `P` 开头，如 `P2002` |
| `meta` | `Record<string, unknown>` | 额外的元数据，内容随错误码不同而变化 |

在 Express 的全局错误处理中间件里，你可以通过 `instanceof` 捕获它：

```typescript
import { Prisma } from '@prisma/client';

if (err instanceof Prisma.PrismaClientKnownRequestError) {
  // 根据 err.code 做分支处理
}
```

---

## 常见错误码速查表

| 错误码 | 含义 | 典型场景 | 处理建议 |
|--------|------|----------|----------|
| `P2002` | **唯一约束冲突** | 注册时邮箱重复；同一购物车添加重复商品（未用 `upsert`） | 读取 `err.meta?.target`，告诉用户哪个字段重复了 |
| `P2025` | **记录不存在** | 对已被删除的记录调用 `update` / `delete` | 返回 404，提示资源不存在 |
| `P2003` | **外键约束失败** | 插入订单项时传了不存在的 `productId` | 返回 400，提示关联资源不存在 |
| `P2014` | 级联删除/更新时关系冲突 | 删除分类但该分类下还有商品 | 返回 409，提示需要先清空关联数据 |

---

## P2002：唯一约束冲突

### `err.meta` 的结构

```typescript
err.meta = {
  modelName: 'User',
  target: ['email'],   // 触发了唯一约束的字段列表
}
```

### 代码示例：提取冲突字段名

```typescript
if (err.code === 'P2002') {
  const field = (err.meta?.target as string[])?.join(', ');
  return res.status(409).json({
    success: false,
    error: {
      code: 'DUPLICATE_ENTRY',
      message: `${field} 已存在`,
    },
  });
}
```

> 如果是联合唯一索引（如 `@@unique([email, phone])`），`target` 会是 `['email', 'phone']`，拼接后变成 `"email, phone 已存在"`。

---

## P2025：记录不存在

这个错误通常出现在你先 `findUnique` 发现记录存在，但在下一步 `update` 之前记录被其他请求删除了（竞态条件）。

```typescript
if (err.code === 'P2025') {
  return res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: '资源不存在',
    },
  });
}
```

---

## 错误处理分层建议

在 Express 的全局错误处理中间件中，推荐按以下顺序判断：

```
AppError（业务预期错误）
  ↓
ZodError（参数校验错误）
  ↓
PrismaClientKnownRequestError（数据库已知错误）
  ↓
未知错误（500，生产环境隐藏详情）
```

这样可以把每一类错误都转换成结构化的 JSON 响应，避免把数据库原生错误信息直接暴露给客户端。

---

## 参考链接

- [Prisma 官方错误码文档](https://www.prisma.io/docs/orm/reference/error-reference)
