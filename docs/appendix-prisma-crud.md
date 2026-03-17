# 附录：Prisma Client CRUD 语法速查表

> 本文档汇总 Prisma ORM 的核心操作语法，供学习参考。
> 
> 类比说明：如果你熟悉 Android Room 或 Retrofit，可以对照理解。

---

## 📦 获取 Prisma Client

```typescript
// src/lib/prisma.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
export default prisma;
```

> 💡 **注意**：Node.js 模块系统天然单例，整个应用共享同一个数据库连接池。

---

## 🎯 核心概念类比

| Prisma 概念 | Android/RN 对应 | 说明 |
|------------|----------------|------|
| **Schema** | Entity / Room 实体类 | 定义数据表结构 |
| **Prisma Client** | Room DAO / Retrofit | 执行数据库操作的对象 |
| **findMany** | `dao.getAll()` | 查询多条记录 |
| **create** | `dao.insert()` | 插入新记录 |
| **include** | `@Relation` + `with` | 关联查询（JOIN） |

---

## 🔍 查询操作（Read）

### 1. findUnique — 根据唯一字段查单条

```typescript
// 根据 ID 查用户（最常用）
const user = await prisma.user.findUnique({
  where: { id: 1 }
});

// 根据 email 查（email 有 @unique 约束）
const user = await prisma.user.findUnique({
  where: { email: 'user@example.com' }
});
```

**类比 Android**：`userDao.findById(1)` 或 `userDao.findByEmail(email)`

---

### 2. findMany — 查询多条（列表）

```typescript
// 查询所有商品
const products = await prisma.product.findMany();

// 带条件查询
const products = await prisma.product.findMany({
  where: {
    categoryId: 5,
    stock: { gt: 0 }  // stock > 0
  }
});

// 排序 + 分页
const products = await prisma.product.findMany({
  orderBy: { createdAt: 'desc' },  // 按时间倒序
  skip: 0,                          // 跳过前 0 条
  take: 10                          // 取 10 条
});
```

---

### 3. Where 条件操作符

| 操作符 | 含义 | 示例 |
|--------|------|------|
| `equals` | 等于 | `{ id: { equals: 1 } }` |
| `not` | 不等于 | `{ id: { not: 1 } }` |
| `gt` | 大于 | `{ price: { gt: 100 } }` |
| `gte` | 大于等于 | `{ stock: { gte: 10 } }` |
| `lt` / `lte` | 小于 / 小于等于 | 同上 |
| `in` | 在数组中 | `{ status: { in: ['PENDING', 'PAID'] } }` |
| `contains` | 包含（字符串） | `{ name: { contains: '手机' } }` |

---

### 4. findFirst — 查第一条

```typescript
// 查某个分类下的第一个商品
const product = await prisma.product.findFirst({
  where: { categoryId: 5 },
  orderBy: { createdAt: 'desc' }
});
```

---

### 5. count — 统计数量

```typescript
// 统计用户总数
const count = await prisma.user.count();

// 统计某分类下的商品数
const count = await prisma.product.count({
  where: { categoryId: 5 }
});
```

---

## ➕ 创建操作（Create）

### 基础创建

```typescript
// 创建单个用户
const user = await prisma.user.create({
  data: {
    email: 'test@example.com',
    passwordHash: 'hashed_password',
    name: '张三',
    role: 'USER'
  }
});
```

---

### 创建并关联（嵌套创建）

```typescript
// 创建用户时同时创建购物车
const user = await prisma.user.create({
  data: {
    email: 'test@example.com',
    passwordHash: 'xxx',
    name: '张三',
    cart: {
      create: {}  // 创建一个空的购物车
    }
  }
});
```

---

### 关联到现有记录（Connect）

```typescript
// 创建商品时关联到现有分类
await prisma.product.create({
  data: {
    name: 'iPhone 15',
    price: 5999,
    category: {
      connect: { id: 1 }  // 关联到 ID 为 1 的分类
    }
  }
});
```

---

## ✏️ 更新操作（Update）

### 更新单条

```typescript
// 更新用户名称
const updated = await prisma.user.update({
  where: { id: 1 },           // 先找到这条记录
  data: { name: '李四' }       // 更新字段
});
```

---

### 批量更新

```typescript
// 将所有管理员改名
await prisma.user.updateMany({
  where: { role: 'ADMIN' },
  data: { name: '管理员' }
});
```

---

### 数字自增/自减（库存扣减场景）

```typescript
// 库存 -1
await prisma.product.update({
  where: { id: 1 },
  data: {
    stock: {
      decrement: 1  // 等效于 stock = stock - 1
    }
  }
});

// 其他原子操作
// increment: 1  // 加 1
// multiply: 2   // 乘以 2
// divide: 2     // 除以 2
```

---

## 🗑️ 删除操作（Delete）

```typescript
// 删除单条
await prisma.user.delete({
  where: { id: 1 }
});

// 批量删除
await prisma.user.deleteMany({
  where: { role: 'USER' }
});
```

> ⚠️ **注意**：如果有关联外键约束且未设置级联删除，删除会报错。需要先删除关联记录。

---

## 🔗 关联查询与字段选择

### include — 查出关联数据（JOIN）

```typescript
// 查用户时同时带出他的购物车和购物车里的商品
const user = await prisma.user.findUnique({
  where: { id: 1 },
  include: {
    cart: {
      include: {
        items: {
          include: {
            product: true  // 继续嵌套
          }
        }
      }
    }
  }
});

// 结果结构：
// user = {
//   id: 1,
//   email: '...',
//   cart: {
//     items: [
//       { quantity: 2, product: { name: 'iPhone', price: 5999 } }
//     ]
//   }
// }
```

---

### select — 只选指定字段

```typescript
// 只查用户名和邮箱，其他字段不要
const users = await prisma.user.findMany({
  select: {
    id: true,
    name: true,
    email: true
    // passwordHash 不会返回，安全！
  }
});
```

**类比 Android**：`@Query("SELECT id, name, email FROM user")`

---

### 组合使用：select + include

```typescript
// 只选用户的基本信息，但 include 关联的购物车完整数据
const user = await prisma.user.findUnique({
  where: { id: 1 },
  select: {
    id: true,
    name: true,
    email: true,
    cart: {
      include: {
        items: true
      }
    }
  }
});
```

---

## 🔄 事务操作（Transaction）

当你的操作需要**原子性**（要么全成功，要么全失败）时使用：

```typescript
// 创建订单并扣减库存（必须同时成功）
await prisma.$transaction(async (tx) => {
  // 1. 创建订单
  const order = await tx.order.create({
    data: {
      userId: 1,
      totalAmount: 1999,
      status: 'PENDING',
      items: {
        create: {
          productId: 5,
          quantity: 1,
          priceSnapshot: 1999
        }
      }
    }
  });
  
  // 2. 扣减库存
  await tx.product.update({
    where: { id: 5 },
    data: { stock: { decrement: 1 } }
  });
  
  return order;
});
```

> 💡 **关键点**：`tx` 参数替代 `prisma`，保证在同一个事务中执行。

---

## 🔧 高级技巧

### 1. Upsert — 存在则更新，不存在则创建

```typescript
await prisma.cartItem.upsert({
  where: {
    cartId_productId: {  // @@unique 组合键
      cartId: 1,
      productId: 5
    }
  },
  update: {
    quantity: { increment: 1 }  // 存在则数量 +1
  },
  create: {
    cartId: 1,
    productId: 5,
    quantity: 1  // 不存在则创建
  }
});
```

---

### 2. Raw Query — 原生 SQL

当 Prisma API 满足不了需求时使用：

```typescript
// 执行原生 SQL 查询
const result = await prisma.$queryRaw`
  SELECT * FROM "Product" 
  WHERE price > ${1000} 
  ORDER BY price DESC
`;

// 注意：模板字符串中的变量会自动参数化，防止 SQL 注入
```

---

## 📚 参考资源

- [Prisma 官方文档 - CRUD 操作](https://www.prisma.io/docs/orm/prisma-client/queries)
- [Prisma Client API 参考](https://www.prisma.io/docs/orm/reference/prisma-client-reference)

---

*本文档作为 EzServer 学习项目的知识补充，建议结合实际代码中的 Repository 层进行对照学习。*
