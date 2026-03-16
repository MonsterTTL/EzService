# 附录：数据库基础知识与 SQL 语法

> 本附录是为没有系统学过数据库的同学准备的速成材料。
> 所有例子都基于 EzServer 电商项目的真实数据结构。

---

## 目录

1. [核心概念：表、行、列](#1-核心概念表行列)
2. [主键与外键](#2-主键与外键)
3. [数据类型](#3-数据类型)
4. [约束（Constraint）](#4-约束constraint)
5. [基础 SQL：增删改查](#5-基础-sql增删改查)
6. [条件查询与排序](#6-条件查询与排序)
7. [JOIN 联表查询](#7-join-联表查询)
8. [聚合函数](#8-聚合函数)
9. [索引](#9-索引)
10. [事务](#10-事务)
11. [与 Android Room 的对比](#11-与-android-room-的对比)

---

## 1. 核心概念：表、行、列

关系型数据库把数据组织成**表（Table）**，就是你能想象到的最直观的表格形式。

```
用户表（User）
┌────┬──────┬─────────────────┬───────────┐
│ id │ name │ email           │ role      │  ← 列（Column / Field）
├────┼──────┼─────────────────┼───────────┤
│  1 │ 张三 │ zs@example.com  │ customer  │  ← 行（Row / Record）
│  2 │ 李四 │ ls@example.com  │ customer  │
│  3 │ 管理 │ admin@shop.com  │ admin     │
└────┴──────┴─────────────────┴───────────┘
```

| 概念 | 数据库术语 | 类比 |
|------|-----------|------|
| 整张表 | Table | Excel 工作表 |
| 一行数据 | Row / Record | Excel 里的一行 |
| 一个字段 | Column / Field | Excel 里的一列 |
| 字段的数据类型 | Data Type | 单元格格式 |

一个数据库里可以有很多张表，EzServer 项目一共有 7 张表：
`User`、`Category`、`Product`、`Cart`、`CartItem`、`Order`、`OrderItem`

---

## 2. 主键与外键

### 主键（Primary Key）

主键是**唯一标识一行数据**的字段。规则：
- 值不能重复
- 不能为空（NULL）
- 不应该改变

最常见的做法是用自增整数 `id`，数据库自动生成，从 1 开始递增。

```sql
-- 创建表时声明主键
CREATE TABLE users (
  id    SERIAL PRIMARY KEY,   -- SERIAL = 自增整数
  name  VARCHAR(100),
  email VARCHAR(255)
);
```

### 外键（Foreign Key）

外键是**指向另一张表主键的字段**，用于建立表与表之间的关联。

```
用户表（User）          订单表（Order）
┌────┬──────┐          ┌─────┬─────────┬───────┐
│ id │ name │          │ id  │ user_id │ total │
├────┼──────┤          ├─────┼─────────┼───────┤
│  1 │ 张三 │◄─────────│ 101 │    1    │ 5999  │
│  2 │ 李四 │◄─────────│ 102 │    1    │   29  │
└────┴──────┘    └─────│ 103 │    2    │  299  │
                       └─────┴─────────┴───────┘
                              ↑
                         这就是外键
                     值必须存在于 User.id 中
```

```sql
CREATE TABLE orders (
  id      SERIAL PRIMARY KEY,
  user_id INT NOT NULL,
  total   DECIMAL(10, 2),

  -- 声明外键约束
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

声明外键后，数据库会自动保证：
- 不能创建 `user_id` 不存在于 `users` 表的订单
- 不能删除还有订单的用户

---

## 3. 数据类型

PostgreSQL 常用的数据类型：

| 类型 | 用途 | 例子 |
|------|------|------|
| `INT` / `INTEGER` | 整数 | id、库存数量 |
| `SERIAL` | 自增整数（常用于主键） | id |
| `BIGINT` | 大整数 | 大数据量的 id |
| `VARCHAR(n)` | 限长字符串，最多 n 个字符 | 用户名、邮箱 |
| `TEXT` | 不限长字符串 | 商品描述、评论内容 |
| `DECIMAL(p, s)` | 精确小数，p 位总精度，s 位小数 | 价格（金额必须用这个，不能用 FLOAT）|
| `BOOLEAN` | 布尔值 true/false | 是否激活 |
| `TIMESTAMP` | 日期+时间 | 创建时间、更新时间 |
| `TEXT[]` | 字符串数组 | 商品图片 URL 列表 |

> **为什么金额不能用 FLOAT？**
> 
> 浮点数存在精度问题：`0.1 + 0.2 = 0.30000000000000004`。
> 电商涉及金钱计算，精度误差是不可接受的，必须用 `DECIMAL`。

---

## 4. 约束（Constraint）

约束是数据库对字段值的强制规则，在数据写入时自动校验。

```sql
CREATE TABLE users (
  id         SERIAL PRIMARY KEY,           -- 主键约束：唯一 + 非空
  email      VARCHAR(255) NOT NULL UNIQUE, -- 非空约束 + 唯一约束
  name       VARCHAR(100) NOT NULL,        -- 非空约束
  role       VARCHAR(20) DEFAULT 'customer', -- 默认值
  created_at TIMESTAMP DEFAULT NOW()       -- 默认值：当前时间
);
```

| 约束 | 含义 |
|------|------|
| `PRIMARY KEY` | 主键：唯一 + 非空 |
| `NOT NULL` | 该字段不能为空 |
| `UNIQUE` | 该字段在表内不能重复 |
| `DEFAULT value` | 不填时用默认值 |
| `FOREIGN KEY` | 外键：值必须存在于另一张表 |
| `CHECK (条件)` | 自定义条件，如 `CHECK (stock >= 0)` |

---

## 5. 基础 SQL：增删改查

SQL 的核心操作只有四个，通常缩写为 **CRUD**。

### CREATE — 插入数据（INSERT）

```sql
-- 插入一条用户记录
INSERT INTO users (name, email, role)
VALUES ('张三', 'zs@example.com', 'customer');

-- 插入多条
INSERT INTO products (name, price, stock)
VALUES 
  ('iPhone 16', 5999.00, 100),
  ('手机壳', 29.00, 500);
```

### READ — 查询数据（SELECT）

```sql
-- 查所有用户
SELECT * FROM users;

-- 查指定字段
SELECT id, name, email FROM users;

-- 加条件
SELECT * FROM users WHERE role = 'admin';

-- 查单条
SELECT * FROM users WHERE id = 1;
```

### UPDATE — 修改数据

```sql
-- 修改张三的邮箱
UPDATE users 
SET email = 'new@example.com'
WHERE id = 1;

-- 修改多个字段
UPDATE products
SET price = 5499.00, stock = 95
WHERE id = 101;
```

> ⚠️ **危险操作**：忘写 `WHERE` 会修改整张表所有行！
> ```sql
> UPDATE products SET price = 0;  -- 所有商品价格变成 0 ！！！
> ```

### DELETE — 删除数据

```sql
-- 删除指定用户
DELETE FROM users WHERE id = 1;

-- 删除所有已取消的订单
DELETE FROM orders WHERE status = 'cancelled';
```

> ⚠️ 同样，忘写 `WHERE` 会删除整张表所有数据！

---

## 6. 条件查询与排序

### WHERE 条件

```sql
-- 比较运算符
SELECT * FROM products WHERE price > 1000;
SELECT * FROM products WHERE price BETWEEN 100 AND 500;
SELECT * FROM products WHERE stock = 0;
SELECT * FROM products WHERE stock != 0;

-- 字符串模糊匹配（LIKE）
-- % 匹配任意字符，_ 匹配单个字符
SELECT * FROM products WHERE name LIKE '%手机%';  -- 名字包含"手机"
SELECT * FROM products WHERE name LIKE '苹果%';   -- 名字以"苹果"开头

-- 多条件
SELECT * FROM products WHERE price > 1000 AND stock > 0;
SELECT * FROM products WHERE category_id = 1 OR category_id = 2;

-- IN 语法（相当于多个 OR）
SELECT * FROM products WHERE category_id IN (1, 2, 3);

-- NULL 值判断（不能用 = NULL，要用 IS NULL）
SELECT * FROM users WHERE avatar_url IS NULL;
SELECT * FROM users WHERE avatar_url IS NOT NULL;
```

### ORDER BY 排序

```sql
-- 按价格升序（默认）
SELECT * FROM products ORDER BY price ASC;

-- 按价格降序
SELECT * FROM products ORDER BY price DESC;

-- 多字段排序：先按分类，同分类内按价格
SELECT * FROM products ORDER BY category_id ASC, price DESC;
```

### LIMIT 和 OFFSET 分页

```sql
-- 取前 10 条（第 1 页）
SELECT * FROM products LIMIT 10;

-- 跳过 10 条，取接下来 10 条（第 2 页）
SELECT * FROM products LIMIT 10 OFFSET 10;

-- 第 N 页的公式：OFFSET = (N-1) * pageSize
```

---

## 7. JOIN 联表查询

JOIN 是关系型数据库最强大的特性——把多张表的数据合并在一起查询。

### INNER JOIN（内连接）

只返回两张表中**都有匹配**的行。

```sql
-- 查询订单，同时带上用户名
SELECT 
  orders.id        AS order_id,
  users.name       AS user_name,
  orders.total
FROM orders
INNER JOIN users ON orders.user_id = users.id;
```

结果：
```
 order_id | user_name | total
----------+-----------+-------
      101 | 张三      |  5999
      102 | 张三      |    29
      103 | 李四      |   299
```

### LEFT JOIN（左连接）

返回左表**所有行**，右表没有匹配的用 NULL 填充。

```sql
-- 查所有用户，以及他们的订单数量（没有订单的用户也显示）
SELECT 
  users.name,
  COUNT(orders.id) AS order_count
FROM users
LEFT JOIN orders ON orders.user_id = users.id
GROUP BY users.id, users.name;
```

结果：
```
 name | order_count
------+-------------
 张三 |           2
 李四 |           1
 王五 |           0   ← 没有订单，但仍然出现在结果中
```

> `INNER JOIN` vs `LEFT JOIN`：
> - INNER JOIN：两边都要有，才出现在结果里
> - LEFT JOIN：左边有就出现，右边没匹配就填 NULL

### 多表 JOIN

```sql
-- 查订单详情：订单 + 商品名称 + 用户名
SELECT
  o.id          AS order_id,
  u.name        AS user_name,
  p.name        AS product_name,
  oi.quantity,
  oi.price_snapshot
FROM orders o
INNER JOIN users u      ON o.user_id = u.id
INNER JOIN order_items oi ON oi.order_id = o.id
INNER JOIN products p   ON oi.product_id = p.id
WHERE o.id = 101;
```

---

## 8. 聚合函数

聚合函数对一组数据进行计算，返回单个结果。

```sql
COUNT(*)          -- 统计行数
SUM(column)       -- 求和
AVG(column)       -- 平均值
MAX(column)       -- 最大值
MIN(column)       -- 最小值
```

```sql
-- 统计用户总数
SELECT COUNT(*) FROM users;

-- 计算订单总金额
SELECT SUM(total) FROM orders WHERE user_id = 1;

-- 各分类的商品数量
SELECT 
  category_id,
  COUNT(*) AS product_count,
  AVG(price) AS avg_price
FROM products
GROUP BY category_id;

-- HAVING：对聚合结果过滤（WHERE 是对原始行过滤）
-- 找出商品数量超过 10 个的分类
SELECT category_id, COUNT(*) AS cnt
FROM products
GROUP BY category_id
HAVING COUNT(*) > 10;
```

---

## 9. 索引

### 为什么需要索引

数据库查询数据的默认方式是**全表扫描**——从第一行读到最后一行，逐行判断是否符合条件。数据量小时没问题，但如果用户表有 100 万条数据：

```sql
SELECT * FROM users WHERE email = 'zs@example.com';
-- 没有索引：扫描 100 万行，很慢
-- 有索引：类似二分查找，极快
```

索引是数据库在内存/磁盘里额外维护的一个**排好序的数据结构**（通常是 B+ 树），让特定字段的查找从 O(n) 降到 O(log n)。

类比：书的**目录**就是索引，让你不用从第一页翻到最后一页去找内容。

### 创建索引

```sql
-- 给 email 字段加索引（登录时按邮箱查用户会很快）
CREATE INDEX idx_users_email ON users(email);

-- UNIQUE 约束会自动创建唯一索引
-- PRIMARY KEY 也会自动创建索引

-- 复合索引（同时用多个字段查询时有用）
CREATE INDEX idx_products_category_price ON products(category_id, price);
```

### 索引的代价

索引不是越多越好：
- 每次写入/更新数据时，索引也要同步更新，**写入变慢**
- 索引本身占用存储空间

**原则**：给经常出现在 `WHERE`、`ORDER BY`、`JOIN ON` 条件里的字段加索引，其他字段不要乱加。

---

## 10. 事务

### 为什么需要事务

用户下单时，需要同时做三件事：
1. 创建订单记录
2. 扣减商品库存
3. 清空购物车

如果第 1 步成功，第 2 步执行到一半时程序崩溃了，数据就会处于**不一致状态**——订单创建了，但库存没扣。

事务保证这三个操作**要么全部成功，要么全部回滚**，不会出现中间状态。

### 事务的四个特性（ACID）

| 特性 | 英文 | 含义 |
|------|------|------|
| 原子性 | Atomicity | 事务里的操作要么全做，要么全不做 |
| 一致性 | Consistency | 事务前后数据库状态都是合法的 |
| 隔离性 | Isolation | 多个事务并发时互不干扰 |
| 持久性 | Durability | 提交成功的数据永久保存，不会丢失 |

### SQL 事务语法

```sql
BEGIN;   -- 开始事务

  INSERT INTO orders (user_id, total) VALUES (1, 5999);
  UPDATE products SET stock = stock - 1 WHERE id = 101;
  DELETE FROM cart_items WHERE cart_id = 1;

COMMIT;  -- 全部成功，提交

-- 如果中途出错：
ROLLBACK;  -- 撤销所有操作，回到 BEGIN 之前的状态
```

### Prisma 里的事务

```typescript
// Prisma 的事务写法
await prisma.$transaction([
  prisma.order.create({ data: { userId: 1, total: 5999 } }),
  prisma.product.update({ where: { id: 101 }, data: { stock: { decrement: 1 } } }),
  prisma.cartItem.deleteMany({ where: { cart: { userId: 1 } } }),
]);
// 三个操作原子执行，任何一个失败就全部回滚
```

---

## 11. 与 Android Room 的对比

你有 Android Room 经验，下面是直接的概念映射：

| Android Room | PostgreSQL / Prisma | 说明 |
|---|---|---|
| `@Entity` | `model` in schema.prisma | 定义表结构 |
| `@PrimaryKey` | `@id` | 主键声明 |
| `@ForeignKey` | `@relation` | 外键关联 |
| `@ColumnInfo` | 字段类型声明 | 字段定义 |
| `@Dao` interface | Prisma Client | 数据访问接口 |
| `@Query("SELECT...")` | `prisma.user.findMany()` | 查询操作 |
| `@Insert` | `prisma.user.create()` | 插入操作 |
| `@Update` | `prisma.user.update()` | 更新操作 |
| `@Delete` | `prisma.user.delete()` | 删除操作 |
| `@Transaction` | `prisma.$transaction()` | 事务 |
| `LiveData` / `Flow` | - | PostgreSQL 没有响应式，后端主动查 |
| SQLite（本地文件） | PostgreSQL（网络服务） | 运行环境不同 |

最大的区别：Room 跑在用户手机本地，只有一个使用者；PostgreSQL 跑在服务器上，同时服务成千上万个并发请求，所以事务和锁机制更复杂，索引优化更重要。

---

*本附录覆盖了 EzServer 项目 Phase 2 ～ Phase 6 涉及的全部数据库基础知识。*
