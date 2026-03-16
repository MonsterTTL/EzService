# Phase 2 - 数据库设计与 Prisma ORM

## 学习目标

完成本阶段后，你将理解：
- 关系型数据库的核心概念：表、字段、主键、外键、索引
- 为什么电商场景要用关系型数据库（而不是 MongoDB 之类的文档型数据库）
- ORM 是什么，它解决了什么问题
- 什么是数据库迁移（Migration）以及为什么它很重要
- Prisma 的 Schema 语法和 Client 的使用方式

---

## 背景知识：关系型数据库

作为移动端开发者，你接触过 SQLite（Android Room 框架的底层）。PostgreSQL 和 SQLite 是同类型的数据库——关系型数据库（RDBMS），原理相通，只是 PostgreSQL 是专业的服务端数据库，功能更强大。

**为什么电商场景用关系型数据库？**

电商数据有复杂的**关联关系**：
- 一个用户有多个订单
- 一个订单包含多个商品
- 一个商品属于一个分类

这些关系在关系型数据库里用**外键**来表达，可以通过 JOIN 操作高效查询。如果用文档型数据库（如 MongoDB），你要么把所有数据嵌套在一起（冗余大），要么用应用层来处理关联（性能差）。

---

## 背景知识：ORM 是什么？

ORM（Object-Relational Mapping，对象关系映射）是一个把**数据库表**映射成**编程语言中的对象**的工具。

没有 ORM 时，你需要手写 SQL：
```javascript
// 裸 SQL，没有类型提示，容易写错
const result = await db.query(
  'SELECT * FROM users WHERE email = $1 AND deleted_at IS NULL',
  [email]
);
```

有了 Prisma ORM：
```typescript
// 有完整的 TypeScript 类型提示，IDE 会自动补全
const user = await prisma.user.findFirst({
  where: { email: email, deletedAt: null }
});
```

Prisma 不只是少写了 SQL，它的 TypeScript 类型提示能在编译阶段就发现很多错误。

这和 Android 的 **Room** 数据库框架非常类似：你定义 Entity 和 DAO，Room 帮你生成数据库操作代码。

---

## 背景知识：数据库迁移（Migration）

**问题场景**：你的项目上线了，数据库里有真实的用户数据。这时你需要给 User 表加一个 `avatar_url` 字段，你该怎么做？

- 不能直接删掉数据库重建（会丢失所有数据）
- 需要执行一条 `ALTER TABLE users ADD COLUMN avatar_url TEXT` 的 SQL

**迁移（Migration）** 就是把这些数据库结构变更记录下来的机制。每次变更都会生成一个带时间戳的 SQL 文件。这样：

1. 团队里每个人的数据库结构都能保持同步
2. 部署到生产环境时，只需要执行新增的迁移文件
3. 出了问题可以回滚

Prisma 的 `prisma migrate dev` 命令会自动对比你的 Schema 变更，生成对应的迁移 SQL 文件。

---

## 数据库设计

我们一共需要 7 张表，设计如下：

```
┌─────────────────────────────────────────────────────────────────┐
│                         数据库关系图                              │
│                                                                  │
│  users ──────────── carts ──── cart_items ──── products         │
│    │                                               │             │
│    └─── orders ──── order_items ───────────────────┘            │
│                                          │                       │
│                                       categories                 │
│                                    (自关联，支持子分类)            │
└─────────────────────────────────────────────────────────────────┘
```

### 表结构设计

**users 表**
| 字段 | 类型 | 说明 |
|------|------|------|
| id | Int (PK) | 主键，自增 |
| email | String (UNIQUE) | 邮箱，唯一，用于登录 |
| passwordHash | String | 密码的 bcrypt 哈希值（不存明文！） |
| name | String | 用户名 |
| role | Enum | USER 或 ADMIN |
| avatarUrl | String? | 头像 URL，可为空 |
| createdAt | DateTime | 创建时间 |

**categories 表**
| 字段 | 类型 | 说明 |
|------|------|------|
| id | Int (PK) | 主键 |
| name | String | 分类名 |
| parentId | Int? | 父分类 ID，NULL 表示顶级分类（自关联） |

**products 表**
| 字段 | 类型 | 说明 |
|------|------|------|
| id | Int (PK) | 主键 |
| name | String | 商品名 |
| description | String | 商品描述 |
| price | Decimal | 价格（用 Decimal 而不是 Float，避免精度丢失！） |
| stock | Int | 库存数量 |
| categoryId | Int (FK) | 所属分类 |
| imageUrls | String[] | 图片 URL 列表（PostgreSQL 支持数组类型） |
| createdAt | DateTime | 创建时间 |

**carts 表**
| 字段 | 类型 | 说明 |
|------|------|------|
| id | Int (PK) | 主键 |
| userId | Int (FK, UNIQUE) | 用户 ID，每个用户只有一个购物车 |

**cart_items 表**
| 字段 | 类型 | 说明 |
|------|------|------|
| id | Int (PK) | 主键 |
| cartId | Int (FK) | 购物车 ID |
| productId | Int (FK) | 商品 ID |
| quantity | Int | 数量 |

**orders 表**
| 字段 | 类型 | 说明 |
|------|------|------|
| id | Int (PK) | 主键 |
| userId | Int (FK) | 用户 ID |
| status | Enum | PENDING / PAID / SHIPPED / COMPLETED / CANCELLED |
| totalAmount | Decimal | 订单总金额（下单时计算快照） |
| address | String | 收货地址 |
| createdAt | DateTime | 创建时间 |

**order_items 表**
| 字段 | 类型 | 说明 |
|------|------|------|
| id | Int (PK) | 主键 |
| orderId | Int (FK) | 订单 ID |
| productId | Int (FK) | 商品 ID |
| quantity | Int | 购买数量 |
| priceSnapshot | Decimal | **下单时的价格快照**（关键！） |

> **为什么要有 priceSnapshot（价格快照）？**
> 
> 如果 `order_items` 只记录 `productId`，那么查询历史订单金额时，用的是商品的**当前价格**。
> 但商品价格会变动！今天你下单时是 99 元，明天商家改价成 199 元，你的历史订单显示的就错了。
> 
> 所以**下单时必须把价格快照保存下来**，这是电商系统的一个基本原则。

---

## 动手步骤

### 步骤 1：安装 PostgreSQL

**推荐方式：使用 Docker（不污染本机环境）**

```bash
# 拉取并启动 PostgreSQL 容器
docker run --name ezserver-postgres \
  -e POSTGRES_USER=ezuser \
  -e POSTGRES_PASSWORD=ezpassword \
  -e POSTGRES_DB=ezserver_db \
  -p 5432:5432 \
  -d postgres:16

# 验证是否启动成功
docker ps
```

**如果没有 Docker，直接安装 PostgreSQL：**
```bash
brew install postgresql@16
brew services start postgresql@16
```

然后创建数据库：
```bash
createdb ezserver_db
```

---

### 步骤 2：安装 Prisma

```bash
npm install -D prisma
npm install @prisma/client
```

初始化 Prisma：
```bash
npx prisma init
```

这会创建三个文件：
- `prisma/schema.prisma`：数据库 Schema 定义文件
- `prisma.config.ts`：Prisma 6.6+ 新增的配置文件，数据库连接在这里配置
- `.env`（如果还没有的话）：自动加入 `DATABASE_URL` 变量

> **注意**：`npx prisma init` 生成的 `schema.prisma` 里 `generator client` 块可能带有 `output = "..."` 这一行，**必须删掉它**。保留 `output` 会导致 Prisma Client 生成到自定义路径，而代码里 `import { PrismaClient } from '@prisma/client'` 找的是默认路径，两者对不上会报 `@prisma/client did not initialize yet` 错误。正确的 generator 块只需要一行：
> ```prisma
> generator client {
>   provider = "prisma-client-js"
> }
> ```

---

### 步骤 3：配置数据库连接

打开 `.env`，修改 `DATABASE_URL`：

```
# 格式：postgresql://用户名:密码@主机:端口/数据库名
DATABASE_URL="postgresql://ezuser:ezpassword@localhost:5432/ezserver_db"
```

> **Prisma 6.19 说明**：`npx prisma init` 会额外生成一个 `prisma.config.ts` 文件。你会发现 VS Code/Cursor 的 Prisma 插件对 schema.prisma 里的 `url` 报一条警告（`url is no longer supported`），这是插件预先植入了 Prisma 7 的校验规则导致的，**可以忽略**。Prisma CLI 6.x 仍然要求 `url` 写在 schema.prisma 里，不受影响。

---

### 步骤 4：编写 Schema

打开 `prisma/schema.prisma`，将其内容替换为以下完整的 Schema：

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// 用户角色枚举
enum Role {
  USER
  ADMIN
}

// 订单状态枚举
enum OrderStatus {
  PENDING    // 待支付
  PAID       // 已支付
  SHIPPED    // 已发货
  COMPLETED  // 已完成
  CANCELLED  // 已取消
}

model User {
  id           Int      @id @default(autoincrement())
  email        String   @unique
  passwordHash String
  name         String
  role         Role     @default(USER)
  avatarUrl    String?
  createdAt    DateTime @default(now())

  cart   Cart?
  orders Order[]
}

model Category {
  id       Int        @id @default(autoincrement())
  name     String
  parentId Int?

  parent   Category?  @relation("CategoryTree", fields: [parentId], references: [id])
  children Category[] @relation("CategoryTree")
  products Product[]
}

model Product {
  id          Int      @id @default(autoincrement())
  name        String
  description String
  price       Decimal  @db.Decimal(10, 2)
  stock       Int      @default(0)
  categoryId  Int
  imageUrls   String[]
  createdAt   DateTime @default(now())

  category   Category    @relation(fields: [categoryId], references: [id])
  cartItems  CartItem[]
  orderItems OrderItem[]
}

model Cart {
  id     Int        @id @default(autoincrement())
  userId Int        @unique
  user   User       @relation(fields: [userId], references: [id])
  items  CartItem[]
}

model CartItem {
  id        Int     @id @default(autoincrement())
  cartId    Int
  productId Int
  quantity  Int

  cart    Cart    @relation(fields: [cartId], references: [id])
  product Product @relation(fields: [productId], references: [id])

  @@unique([cartId, productId])
}

model Order {
  id          Int         @id @default(autoincrement())
  userId      Int
  status      OrderStatus @default(PENDING)
  totalAmount Decimal     @db.Decimal(10, 2)
  address     String
  createdAt   DateTime    @default(now())

  user  User        @relation(fields: [userId], references: [id])
  items OrderItem[]
}

model OrderItem {
  id             Int     @id @default(autoincrement())
  orderId        Int
  productId      Int
  quantity       Int
  priceSnapshot  Decimal @db.Decimal(10, 2)

  order   Order   @relation(fields: [orderId], references: [id])
  product Product @relation(fields: [productId], references: [id])
}
```

**Schema 语法解释：**

- `@id`：主键
- `@default(autoincrement())`：自增主键
- `@unique`：唯一约束
- `@default(now())`：默认值为当前时间
- `@relation`：定义外键关联关系
- `@db.Decimal(10, 2)`：指定数据库层面的类型，10 位有效数字，保留 2 位小数
- `@@unique([cartId, productId])`：组合唯一约束（同一个购物车里同一个商品只能有一条记录）

---

### 步骤 5：执行数据库迁移

```bash
npx prisma migrate dev --name init
```

这个命令会：
1. 对比 Schema 和数据库现状的差异
2. 生成一个 SQL 迁移文件（位于 `prisma/migrations/` 目录）
3. 在数据库中执行这个 SQL
4. 自动调用 `prisma generate`，生成 Prisma Client 的 TypeScript 类型

> **如果迁移中途报错导致 generate 没有执行**，可以单独手动运行：
> ```bash
> npx prisma generate
> ```

迁移成功后你会看到类似：
```
✔ Generated Prisma Client (v5.x.x)

The following migration(s) have been created and applied from new schema changes:

migrations/
  └─ 20240101000000_init/
    └─ migration.sql
```

---

### 步骤 6：用 Prisma Studio 查看数据库

```bash
npx prisma studio
```

浏览器会自动打开一个可视化的数据库管理界面，你可以在这里直观地查看和编辑数据。

---

### 步骤 7：创建 Prisma Client 单例

在 `src/` 目录下创建 `src/prisma.ts`（注意：不是 `prisma/` 目录）：

```typescript
import { PrismaClient } from '@prisma/client';

// 为什么要用单例模式？
// PrismaClient 会维护一个数据库连接池。
// 如果每次使用都 new PrismaClient()，会创建大量连接，耗尽数据库连接数。
// 所以整个应用只需要一个 PrismaClient 实例。
const prisma = new PrismaClient({
  log: ['query', 'error', 'warn'],
});

export default prisma;
```

---

### 步骤 8：动手练习 CRUD

创建 `src/test-db.ts` 来练习 Prisma 基础操作（这个文件只用于学习，之后可以删除）：

```typescript
import prisma from './prisma';

async function main() {
  // 创建一个分类
  const category = await prisma.category.create({
    data: { name: '手机数码' }
  });
  console.log('创建分类:', category);

  // 创建一个商品
  const product = await prisma.product.create({
    data: {
      name: 'iPhone 15',
      description: '苹果最新款手机',
      price: 5999.00,
      stock: 100,
      categoryId: category.id,
      imageUrls: ['https://example.com/iphone15.jpg'],
    }
  });
  console.log('创建商品:', product);

  // 查询商品列表（带分类信息）
  const products = await prisma.product.findMany({
    include: { category: true }  // 类似 SQL 的 JOIN
  });
  console.log('商品列表:', JSON.stringify(products, null, 2));

  // 更新库存
  const updated = await prisma.product.update({
    where: { id: product.id },
    data: { stock: { decrement: 1 } }  // 原子操作，stock = stock - 1
  });
  console.log('更新后库存:', updated.stock);

  // 删除（清理测试数据）
  await prisma.product.delete({ where: { id: product.id } });
  await prisma.category.delete({ where: { id: category.id } });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
```

运行：
```bash
npx ts-node src/test-db.ts
```

---

## 常见问题

**Q: 执行迁移时报 "connection refused"**

A: PostgreSQL 没有启动。检查 Docker 容器状态：
```bash
docker ps
docker start ezserver-postgres  # 重新启动容器
```

**Q: 修改了 Schema 后怎么更新数据库？**

A: 再次运行 `npx prisma migrate dev --name 描述这次变更的名字`，Prisma 会自动检测变化并生成新的迁移文件。

**Q: `include` 和 `select` 的区别是什么？**

- `include: { category: true }` —— 查出 Product 的所有字段，**额外**附带关联的 category
- `select: { name: true, price: true }` —— **只查**指定的字段，不会多查

---

## 阶段小结

| 概念 | 类比（Android） | 本质 |
|------|----------------|------|
| `schema.prisma` | Room 的 `@Entity` | 数据库表结构定义 |
| `prisma migrate dev` | Room 的自动迁移 | 数据库结构变更管理 |
| `prisma.user.findMany()` | Room 的 `userDao.getAll()` | ORM 查询操作 |
| `include` | Room 的 `@Relation` | 查询时带上关联数据（JOIN） |

---

## 完成标志

- [ ] PostgreSQL 成功启动，可以连接
- [ ] `npx prisma migrate dev` 成功执行，生成了 `prisma/migrations/` 目录
- [ ] Prisma Studio 能打开，能看到所有表
- [ ] `src/test-db.ts` 的 CRUD 练习全部成功
- [ ] 理解 `priceSnapshot` 存在的原因

完成后，进入 [Phase 3 - 用户认证模块](./phase3-auth.md)。
