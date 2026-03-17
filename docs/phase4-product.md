# Phase 4 - 商品模块（分层架构 + 参数校验 + 文件上传）

## 学习目标

完成本阶段后，你将理解：
- Controller-Service-Repository 三层架构在实际项目中如何运用
- 为什么要用 Zod 做请求参数校验，而不是手写 if 判断
- 分页查询（Pagination）的设计原理
- 文件上传在后端是如何处理的（Multipart/form-data）
- 如何用中间件优雅地保护需要管理员权限的接口

---

## 背景知识：为什么需要请求参数校验？

客户端开发者经常遇到接口返回 500 的情况，很多时候是因为后端没做参数校验，收到了格式错误的数据就直接往数据库写，导致崩溃。

**不做校验的后果：**

```typescript
// 没有校验：如果 price 传了字符串 "abc"，Prisma 会抛异常
const product = await prisma.product.create({
  data: { name: req.body.name, price: req.body.price }
});
```

**用 Zod 校验：**

```typescript
const schema = z.object({
  name: z.string().min(1, '商品名不能为空').max(100),
  price: z.number().positive('价格必须大于 0'),
});

const result = schema.safeParse(req.body);
if (!result.success) {
  // 返回清晰的校验错误信息，而不是 500
  return res.status(400).json({ error: result.error.format() });
}
```

Zod 的优势：**校验逻辑即类型**。你定义了 Schema，Zod 自动推断出对应的 TypeScript 类型，不需要重复写 interface。

---

## 背景知识：分页查询

如果商品有 10 万条，一次全部返回既慢又占内存。分页是必须的。

**常见的两种分页方式：**

1. **Offset 分页（页码分页）**：`page=2&pageSize=20` → 跳过前 20 条，取第 21-40 条
   - 简单，支持跳页
   - 缺点：数据量大时性能差（`OFFSET 100000` 数据库仍需扫描前 10 万行）

2. **Cursor 分页（游标分页）**：`cursor=lastItemId` → 从上次最后一条之后继续取
   - 性能好，适合信息流
   - 缺点：不能跳页

我们使用更常见的 Offset 分页，这也是大多数管理后台的做法。

---

## 背景知识：文件上传原理

普通 JSON 请求的 `Content-Type` 是 `application/json`。

文件上传的 `Content-Type` 是 `multipart/form-data`——这是一种特殊的编码格式，可以同时发送文件二进制数据和文本字段。

作为客户端开发者，你一定在 `OkHttp` 里用过 `MultipartBody`：
```kotlin
val body = MultipartBody.Builder()
    .setType(MultipartBody.FORM)
    .addFormDataPart("file", "image.jpg", RequestBody.create(mediaType, file))
    .addFormDataPart("productId", "123")
    .build()
```

服务端的 `Multer` 就是负责解析这个 Multipart 格式的中间件。

---

## 动手步骤

### 步骤 1：安装依赖

```bash
npm install zod multer
npm install -D @types/multer
```

### 步骤 2：创建 Zod 校验 Schema

创建 `src/types/product.schemas.ts`：

```typescript
import { z } from 'zod';

// 创建商品的请求体 Schema
// ⚠️ 注意：创建商品使用 multipart/form-data 格式，所有字段值传输时都是字符串
// 所以 price、stock、categoryId 必须用 z.coerce.number() 而不是 z.number()
// z.coerce 会先把字符串 "8999" 转换成数字 8999，再进行校验
export const createProductSchema = z.object({
  name: z.string().min(1, '商品名不能为空').max(100, '商品名最多 100 字'),
  description: z.string().min(1, '请填写商品描述'),
  price: z.coerce.number().positive('价格必须大于 0'),
  stock: z.coerce.number().int('库存必须是整数').min(0, '库存不能为负数'),
  categoryId: z.coerce.number().int().positive(),
});

// 更新商品：所有字段都是可选的
export const updateProductSchema = createProductSchema.partial();

// 商品列表查询参数 Schema
export const productQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),      // coerce: 把字符串 "1" 转成数字 1
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  categoryId: z.coerce.number().int().positive().optional(),
  keyword: z.string().optional(),
  minPrice: z.coerce.number().min(0).optional(),
  maxPrice: z.coerce.number().min(0).optional(),
});

// 从 Schema 推断类型（不需要单独写 interface！）
export type CreateProductDto = z.infer<typeof createProductSchema>;
export type UpdateProductDto = z.infer<typeof updateProductSchema>;
export type ProductQuery = z.infer<typeof productQuerySchema>;
```

### 步骤 3：创建 Zod 校验中间件

创建 `src/middlewares/validate.middleware.ts`：

```typescript
import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';

// 工厂函数：接受一个 Zod Schema，返回一个中间件
// target 指定校验哪个部分：body、query、params
export function validate(schema: ZodSchema, target: 'body' | 'query' | 'params' = 'body') {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req[target]);
    
    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: '请求参数错误',
          details: result.error.flatten().fieldErrors,
        },
      });
    }
    
    // 把校验后的数据（已做类型转换和默认值填充）写回去
    // ⚠️ 注意：req.query 在新版 Express/router 中是只读的 getter，不能直接赋值
    // 必须用 Object.defineProperty 在实例层面重新定义该属性才能覆盖
    if (target === 'query') {
      Object.defineProperty(req, 'query', {
        value: result.data,
        writable: true,
        configurable: true,
      });
    } else {
      req[target] = result.data;
    }
    next();
  };
}
```

---

### 补充知识：为什么 Controller 里可以直接传 `req.body` 给 Service？

你可能注意到，在 Controller 中我们是这样调用 Service 的：

```typescript
const product = await productService.createProduct(req.body, imageUrls);
```

但 `req.body` 在 TypeScript 中类型是 `any`，为什么能直接传给需要 `CreateProductDto` 类型的 Service 呢？

**答案是 Zod 中间件已经帮我们做好了校验和转换。**

#### 中间件的执行顺序

看路由定义：

```typescript
router.post('/',
  authenticate,        // 第1步：验证登录
  authorize('ADMIN'),  // 第2步：验证权限
  uploadImages,        // 第3步：处理文件上传
  validate(createProductSchema),  // 第4步：Zod 校验
  productController.createProduct // 第5步：执行 Controller
);
```

#### Zod 中间件做了什么

当 `validate(createProductSchema)` 执行时：

1. **校验数据格式** - 检查 `req.body` 是否符合 schema 定义
2. **类型转换** - 把字符串 `"100"` 转成数字 `100`
3. **过滤多余字段** - 删除不在 schema 中的字段（防止注入）
4. **填充默认值** - 给可选字段填充默认值
5. **写回 req.body** - 把处理后的干净数据重新赋值给 `req.body`

所以执行到 Controller 时，`req.body` 已经是符合 `CreateProductDto` 类型的**干净数据**了：

| 原始 req.body | Zod 处理后 |
|--------------|-----------|
| `{ "price": "100" }`（字符串） | `{ "price": 100 }`（数字） |
| `{ "name": "", "hack": "xxx" }` | 校验失败，返回 400 |
| `{ "name": "商品" }`（缺可选字段） | `{ "name": "商品", "stock": 0 }`（填充默认值） |

**这就是为什么可以直接传 `req.body`** —— 虽然 TypeScript 显示它是 `any`，但实际上它已经被 Zod "净化"过了。

---

### 步骤 4：创建文件上传中间件

创建 `src/middlewares/upload.middleware.ts`：

```typescript
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { AppError } from '../utils/AppError';

const UPLOAD_DIR = process.env.UPLOAD_DIR || 'uploads';

// 确保上传目录存在
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// 配置文件存储方式
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    // 文件名：时间戳 + 随机数 + 原始扩展名
    // 避免文件名冲突，同时防止文件名注入攻击
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${uniqueSuffix}${path.extname(file.originalname)}`);
  },
});

// 文件类型过滤：只允许图片
const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new AppError('只允许上传 JPG、PNG、WebP 格式的图片', 400, 'INVALID_FILE_TYPE'));
  }
};

export const uploadImages = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
    files: 5,                   // 最多 5 张图
  },
}).array('images', 5);          // 字段名为 "images"，最多 5 个
```

### 步骤 5：创建商品 Repository

创建 `src/repositories/product.repository.ts`：

```typescript
import prisma from '../prisma';
import { ProductQuery } from '../types/product.schemas';

export const productRepository = {
  async findMany(query: ProductQuery) {
    const { page, pageSize, categoryId, keyword, minPrice, maxPrice } = query;

    // 动态构建 where 条件
    const where: any = {};
    if (categoryId) where.categoryId = categoryId;
    if (keyword) where.name = { contains: keyword, mode: 'insensitive' }; // 不区分大小写
    if (minPrice !== undefined) where.price = { ...where.price, gte: minPrice };
    if (maxPrice !== undefined) where.price = { ...where.price, lte: maxPrice };

    const [total, items] = await prisma.$transaction([
      prisma.product.count({ where }),
      prisma.product.findMany({
        where,
        include: { category: { select: { id: true, name: true } } },
        skip: (page - 1) * pageSize,   // 跳过前几条
        take: pageSize,                  // 取几条
        orderBy: { createdAt: 'desc' }, // 按创建时间倒序
      }),
    ]);

    return { total, items, page, pageSize };
  },

  findById(id: number) {
    return prisma.product.findUnique({
      where: { id },
      include: { category: { select: { id: true, name: true } } },
    });
  },

  create(data: {
    name: string;
    description: string;
    price: number;
    stock: number;
    categoryId: number;
    imageUrls: string[];
  }) {
    return prisma.product.create({ data });
  },

  update(id: number, data: Partial<{ name: string; description: string; price: number; stock: number; categoryId: number; imageUrls: string[] }>) {
    return prisma.product.update({ where: { id }, data });
  },

  delete(id: number) {
    return prisma.product.delete({ where: { id } });
  },
};
```

### 步骤 6：创建商品 Service

创建 `src/services/product.service.ts`：

```typescript
import { productRepository } from '../repositories/product.repository';
import { AppError } from '../utils/AppError';
import { CreateProductDto, UpdateProductDto, ProductQuery } from '../types/product.schemas';

export const productService = {
  async getProducts(query: ProductQuery) {
    return productRepository.findMany(query);
  },

  async getProductById(id: number) {
    const product = await productRepository.findById(id);
    if (!product) {
      throw new AppError('商品不存在', 404, 'PRODUCT_NOT_FOUND');
    }
    return product;
  },

  async createProduct(dto: CreateProductDto, imageUrls: string[]) {
    return productRepository.create({ ...dto, imageUrls });
  },

  async updateProduct(id: number, dto: UpdateProductDto, newImageUrls?: string[]) {
    await this.getProductById(id); // 验证存在
    const data: any = { ...dto };
    if (newImageUrls && newImageUrls.length > 0) {
      data.imageUrls = newImageUrls;
    }
    return productRepository.update(id, data);
  },

  async deleteProduct(id: number) {
    await this.getProductById(id); // 验证存在
    await productRepository.delete(id);
  },
};
```

### 步骤 7：创建商品 Controller

创建 `src/controllers/product.controller.ts`：

```typescript
import { Request, Response, NextFunction } from 'express';
import { productService } from '../services/product.service';
import { ProductQuery } from '../types/product.schemas';

export const productController = {
  async getProducts(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await productService.getProducts(req.query as any as ProductQuery);
      res.json({ success: true, data: result });
    } catch (error) { next(error); }
  },

  async getProductById(req: Request, res: Response, next: NextFunction) {
    try {
      const product = await productService.getProductById(parseInt(req.params.id));
      res.json({ success: true, data: product });
    } catch (error) { next(error); }
  },

  async createProduct(req: Request, res: Response, next: NextFunction) {
    try {
      // 处理上传的图片文件
      const files = req.files as Express.Multer.File[];
      const imageUrls = files?.map(f => `/uploads/${f.filename}`) ?? [];
      
      const product = await productService.createProduct(req.body, imageUrls);
      res.status(201).json({ success: true, data: product });
    } catch (error) { next(error); }
  },

  async updateProduct(req: Request, res: Response, next: NextFunction) {
    try {
      const files = req.files as Express.Multer.File[];
      const newImageUrls = files?.map(f => `/uploads/${f.filename}`);
      
      const product = await productService.updateProduct(
        parseInt(req.params.id),
        req.body,
        newImageUrls
      );
      res.json({ success: true, data: product });
    } catch (error) { next(error); }
  },

  async deleteProduct(req: Request, res: Response, next: NextFunction) {
    try {
      await productService.deleteProduct(parseInt(req.params.id));
      res.json({ success: true, data: null });
    } catch (error) { next(error); }
  },
};
```

---

### 补充知识：Request 对象中的各种参数有什么区别？

在 Controller 中，我们看到 `req.params`、`req.query`、`req.body`、`req.files` 等属性，它们分别来自 HTTP 请求的不同部分：

```
POST /api/products?page=1&keyword=phone HTTP/1.1
Host: localhost:3000
Content-Type: multipart/form-data
Authorization: Bearer xxx

------Boundary
Content-Disposition: form-data; name="name"

iPhone 15
------Boundary
Content-Disposition: form-data; name="images"; filename="photo.jpg"

[二进制图片数据]
```

#### 1. `req.params` - 路由参数（Path Parameters）

**来源**：URL 路径中的占位符

```typescript
// 路由定义
router.get('/products/:id', ...);
// 请求：GET /api/products/123
// 结果：req.params = { id: "123" }
```

**特点**：
- 用于标识**资源的唯一标识**（ID、slug 等）
- 是 URL 路径的一部分
- 如果没有这个参数，路由根本不匹配（返回 404）

#### 2. `req.query` - 查询参数（Query Parameters）

**来源**：URL 中 `?` 后面的键值对

```typescript
// 请求：GET /api/products?page=1&keyword=phone
// 结果：req.query = { page: "1", keyword: "phone" }
```

**特点**：
- 用于**过滤、排序、分页**等非标识性条件
- 可选参数，不影响路由匹配
- 所有值都是**字符串**，需要用 Zod 的 `coerce` 转换

#### 3. `req.body` - 请求体（Request Body）

**来源**：POST/PUT/PATCH 请求中发送的数据

```typescript
// POST /api/products
// Content-Type: application/json
// Body: { "name": "iPhone", "price": 5999 }
// 结果：req.body = { name: "iPhone", price: 5999 }
```

**特点**：
- 用于传递**资源内容**（创建/更新时的数据）
- 需要 `express.json()` 或 multer 中间件解析
- 经过 Zod 校验后类型是安全的

#### 4. `req.files` - 上传的文件

**来源**：multipart/form-data 中的文件字段

```typescript
// 需要 multer 中间件
req.files = [
  {
    fieldname: "images",
    filename: "1688888888888-123456789.jpg",
    path: "uploads/1688888888888-123456789.jpg",
    size: 1024000
  }
]
```

#### 5. `req.headers` - 请求头

```typescript
req.headers = {
  "authorization": "Bearer xxx",
  "content-type": "application/json"
}
```

#### 对比总结

| 属性 | 来源 | 常见用途 | 示例 |
|-----|------|---------|------|
| `params` | URL 路径段 | 资源唯一标识 | `{ id: "123" }` |
| `query` | `?` 后的参数 | 分页、过滤、搜索 | `{ page: "1", keyword: "phone" }` |
| `body` | 请求体 | 资源数据 | `{ name: "iPhone", price: 5999 }` |
| `files` | multipart 表单 | 文件上传 | `[{ filename: "xxx.jpg" }]` |
| `headers` | HTTP 头部 | 认证、内容类型 | `{ authorization: "Bearer xxx" }` |

⚠️ **重要提醒**：`params` 和 `query` 中的值始终是**字符串**，需要用 `parseInt()` 或 Zod 的 `coerce` 进行类型转换。

---

### 步骤 8：创建商品路由

创建 `src/routes/product.routes.ts`：

```typescript
import { Router } from 'express';
import { productController } from '../controllers/product.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import { uploadImages } from '../middlewares/upload.middleware';
import { createProductSchema, productQuerySchema, updateProductSchema } from '../types/product.schemas';

const router = Router();

// 公开接口（不需要登录）
router.get('/', validate(productQuerySchema, 'query'), productController.getProducts);
router.get('/:id', productController.getProductById);

// 管理员接口（需要登录 + ADMIN 角色）
// 中间件链：authenticate → authorize('ADMIN') → uploadImages → validate → controller
router.post('/',
  authenticate,
  authorize('ADMIN'),
  uploadImages,
  validate(createProductSchema),
  productController.createProduct
);

router.put('/:id',
  authenticate,
  authorize('ADMIN'),
  uploadImages,
  validate(updateProductSchema),
  productController.updateProduct
);

router.delete('/:id',
  authenticate,
  authorize('ADMIN'),
  productController.deleteProduct
);

export default router;
```

---

### 补充知识：为什么获取单个商品用 `/products/123` 而不是 `/products?id=123`？

两种写法都能实现，但 RESTful API 有明确的规范：

```
GET /api/products/123      ← Path Parameter（当前项目用的）
GET /api/products?id=123   ← Query Parameter（另一种写法）
```

#### 为什么用 Path Parameter 更好？

**1. REST 的资源定位思想**

REST 的核心理念是**用 URL 表示资源层级**：

```
GET    /products              → 获取【所有商品】集合
GET    /products/123          → 获取【ID为123的具体商品】
GET    /products/123/reviews  → 获取【该商品的评价】
POST   /products              → 在【商品集合】中新建一个
PUT    /products/123          → 替换【ID为123的商品】
DELETE /products/123          → 删除【ID为123的商品】
```

如果用 `?id=123`，资源层级就不清晰了：
```
GET /products?id=123  → 看起来还是在操作"商品集合"，只是加了过滤
```

**2. HTTP 语义对齐**

| 场景 | 推荐写法 | 原因 |
|-----|---------|------|
| 获取**单个资源** | `/products/123` | URL 指向唯一资源 |
| **过滤**集合 | `/products?category=1` | query 表示筛选条件 |
| **搜索** | `/products?keyword=phone` | query 表示查询参数 |

**3. 类型安全与错误处理**

使用 Path Parameter：
```typescript
router.get('/:id', ...)
// GET /api/products/  → 404，路由不匹配
```

使用 Query：
```typescript
router.get('/', ...)
// GET /api/products/  → 200，返回列表（逻辑完全错了！）
// 必须手动检查 if (!query.id) return 400
```

**4. 缓存友好**

CDN 和浏览器对 URL 的缓存：
- `/products/123` → 被视为**不同资源**，独立缓存
- `/products?id=123` → 如果后面还有其他参数，缓存命中率低

#### 一句话总结

> **Path Parameter 是资源的"地址"，Query Parameter 是资源的"筛选条件"。**

在我们的路由中可以看到这个区分：
```typescript
// 获取列表：用 query 进行分页、过滤
router.get('/', validate(productQuerySchema, 'query'), productController.getProducts);

// 获取单个：用 params 标识资源
router.get('/:id', productController.getProductById);
```

---

### 步骤 9：更新 app.ts，提供静态文件服务

```typescript
import express from 'express';
import path from 'path';
// ... 其他 import

app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);

// 错误处理放最后
app.use(errorHandler);
```

`express.static` 会把 `uploads/` 目录下的文件通过 HTTP 提供访问，这样客户端就能通过 `/uploads/文件名.jpg` 下载图片了。

---

## 用 Postman 测试

### 创建管理员账号

先注册一个普通用户，然后用 Prisma Studio 手动把 `role` 改成 `ADMIN`：
```bash
npx prisma studio
```
在 Prisma Studio 里找到你的用户记录，把 `role` 字段改成 `ADMIN`，保存。

### 创建商品（需要 ADMIN Token）
```
POST http://localhost:3000/api/products
Authorization: Bearer <admin_token>

name: iPhone 15 Pro
description: 苹果最新旗舰
price: 8999
stock: 50
categoryId: 1
images: [上传一张图片文件]
```

> ⚠️ **Postman 注意事项**：选择 Body → form-data 格式后，**不要**在 Headers 里手动设置 `Content-Type`。
> Postman 会自动生成带 `boundary` 参数的完整 Content-Type 头（如 `multipart/form-data; boundary=----FormBoundaryXXX`）。
> 如果手动填写了 `Content-Type: multipart/form-data`，Multer 会因为找不到 boundary 而报错：`Multipart: Boundary not found`。
>
> 另外，`categoryId` 填写的值必须是数据库 `Category` 表中真实存在的记录 ID，否则会报外键约束错误。
> 可以先通过 `npx prisma studio` 在 Category 表中创建一条分类记录，再用其 id 创建商品。

### 查询商品列表（带分页和过滤）
```
GET http://localhost:3000/api/products?page=1&pageSize=10&keyword=iPhone
GET http://localhost:3000/api/products?minPrice=1000&maxPrice=10000
GET http://localhost:3000/api/products?categoryId=1
```

---

## 阶段小结

**三层架构职责：**

```
Controller（薄层）
    ├─ 解析 HTTP 请求（req.body, req.params, req.query, req.files）
    ├─ 调用 Service
    └─ 格式化 HTTP 响应

Service（厚层 - 核心）
    ├─ 业务规则验证（商品是否存在）
    ├─ 业务逻辑编排（调用多个 Repository）
    └─ 抛出业务异常（AppError）

Repository（薄层）
    ├─ 数据库查询
    └─ 不包含任何业务逻辑
```

---

## 完成标志

- [ ] 创建商品接口（需要 ADMIN）正常工作，支持图片上传
- [ ] 商品列表支持分页、关键词搜索、价格过滤
- [ ] 非管理员用户调用创建/删除接口返回 403
- [ ] 请求参数错误时返回清晰的 400 错误（包含字段级别的错误信息）
- [ ] 上传的图片可以通过 `/uploads/xxx.jpg` 访问

完成后，进入 [Phase 5 - 购物车模块](./phase5-cart.md)。
