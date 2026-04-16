# Phase 7 - 工程化收尾

## 学习目标

完成本阶段后，你将理解：
- 为什么需要统一的错误处理，以及如何设计一个健壮的错误处理体系
- 日志系统的作用：调试、监控、审计
- API 文档的重要性，如何用 Swagger 自动生成
- 环境变量的规范管理
- 一些让代码更"工程化"的实践

---

## 背景知识：为什么工程化很重要？

功能代码写完只是第一步。真正可维护的后端服务还需要：

1. **可观测性**：出了问题能快速定位。日志是最基本的手段。
2. **健壮性**：任何未捕获的异常都不应该让服务崩溃，应该优雅处理并返回合适的错误响应。
3. **可协作性**：API 文档让前端/客户端开发者知道如何调用你的接口，不需要你一个个口头说明。

---

## 背景知识：日志级别

工程日志通常分以下几个级别（从低到高）：

| 级别 | 用途 | 举例 |
|------|------|------|
| `debug` | 开发调试，生产环境一般关闭 | SQL 查询语句 |
| `info` | 关键业务流程信息 | 用户登录、下单 |
| `warn` | 潜在问题，但还能正常运行 | 接口响应时间超过 1 秒 |
| `error` | 错误，需要关注 | 数据库连接失败 |

**Morgan** 是 Express 的 HTTP 请求日志中间件，记录每个请求的方法、路径、状态码、耗时等信息。这对于后期排查问题非常有用。

---

## 动手步骤

### 步骤 1：完善全局错误处理

我们在 Phase 3 创建了基础的 `errorHandler`，现在来完善它——处理更多类型的错误。

更新 `src/middlewares/error.middleware.ts`：

```typescript
import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/AppError';
import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) {
  // 1. 我们自定义的业务错误（预期内的错误）
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      error: { code: err.code || 'ERROR', message: err.message },
    });
  }

  // 2. Zod 校验错误（通常已被 validate 中间件处理，这里是兜底）
  if (err instanceof ZodError) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: '请求参数错误',
        details: err.flatten().fieldErrors,
      },
    });
  }

  // 3. Prisma 数据库错误
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    // P2002: 唯一约束违反（如邮箱重复）
    if (err.code === 'P2002') {
      const field = (err.meta?.target as string[])?.join(', ');
      return res.status(409).json({
        success: false,
        error: { code: 'DUPLICATE_ENTRY', message: `${field} 已存在` },
      });
    }
    // P2025: 记录不存在（如 findUnique 返回 null 后调用 update）
    if (err.code === 'P2025') {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: '资源不存在' },
      });
    }
  }

  // 4. 未知错误（预期外的 Bug）
  // 生产环境不暴露错误细节，开发环境打印 stack trace
  console.error('[未知错误]', err);
  return res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: process.env.NODE_ENV === 'development' ? err.message : '服务器内部错误',
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    },
  });
}

// 处理 404 路由不存在
export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `接口 ${req.method} ${req.path} 不存在`,
    },
  });
}
```

在 `app.ts` 中，在所有路由之后加上 404 处理和错误处理：

```typescript
// 404 处理（放在所有路由之后、errorHandler 之前）
app.use(notFoundHandler);

// 全局错误处理（必须在最后）
app.use(errorHandler);
```

### 步骤 2：集成 Morgan 请求日志

更新 `src/app.ts`，加入日志中间件：

```typescript
import morgan from 'morgan';

// 开发环境使用 'dev' 格式（颜色高亮，简洁）
// 生产环境使用 'combined' 格式（标准 Apache 日志格式，包含更多信息）
const morganFormat = process.env.NODE_ENV === 'production' ? 'combined' : 'dev';
app.use(morgan(morganFormat));
```

启动服务后，每个请求都会在控制台打印类似：
```
GET /api/products 200 15.234 ms - 1024
POST /api/auth/login 401 8.123 ms - 89
```

这让你在开发时能清楚地看到每个请求的状态。

### 步骤 3：安装 Swagger

```bash
npm install swagger-jsdoc swagger-ui-express
npm install -D @types/swagger-jsdoc @types/swagger-ui-express
```

### 步骤 4：配置 Swagger

创建 `src/utils/swagger.ts`：

```typescript
import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'EzServer API',
      version: '1.0.0',
      description: '电商后台 API 文档',
    },
    servers: [
      { url: 'http://localhost:3000', description: '本地开发环境' }
    ],
    components: {
      securitySchemes: {
        // 定义 Bearer Token 认证方式
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
  },
  // 告诉 swagger-jsdoc 去哪里找 @swagger 注释
  apis: ['./src/routes/*.ts'],
};

export const swaggerSpec = swaggerJsdoc(options);
```

在 `app.ts` 中注册 Swagger UI：

```typescript
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './utils/swagger';

// Swagger UI 页面（仅在非生产环境暴露）
if (process.env.NODE_ENV !== 'production') {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
  console.log(`📚 API 文档: http://localhost:${PORT}/api-docs`);
}
```

### 步骤 5：给路由添加 Swagger 注释

在 `src/routes/auth.routes.ts` 里，用 JSDoc 注释来描述接口。Swagger 会自动解析这些注释生成文档。

```typescript
/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: 用户注册
 *     tags: [认证]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password, name]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: user@example.com
 *               password:
 *                 type: string
 *                 minLength: 6
 *                 example: password123
 *               name:
 *                 type: string
 *                 example: 张三
 *     responses:
 *       201:
 *         description: 注册成功，返回 Token 和用户信息
 *       409:
 *         description: 邮箱已注册
 */
router.post('/register', authController.register);

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: 用户登录
 *     tags: [认证]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *                 example: user@example.com
 *               password:
 *                 type: string
 *                 example: password123
 *     responses:
 *       200:
 *         description: 登录成功
 *       401:
 *         description: 邮箱或密码错误
 */
router.post('/login', authController.login);

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: 获取当前用户信息
 *     tags: [认证]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: 用户信息
 *       401:
 *         description: 未认证
 */
router.get('/me', authenticate, authController.getMe);
```

然后按照同样的格式，为 **商品、购物车、订单** 的路由也添加 Swagger 注释。这是个繁琐但很有价值的练习——它逼迫你清晰地思考每个接口的输入输出。

### 步骤 6：添加种子数据（可选但推荐）

创建 `prisma/seed.ts`，用来初始化一些测试数据：

```typescript
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('开始填充种子数据...');

  // 创建管理员
  const adminPasswordHash = await bcrypt.hash('admin123456', 12);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@ezserver.com' },
    update: {},
    create: {
      email: 'admin@ezserver.com',
      passwordHash: adminPasswordHash,
      name: '超级管理员',
      role: 'ADMIN',
    },
  });
  console.log('创建管理员:', admin.email);

  // 创建分类
  const electronics = await prisma.category.upsert({
    where: { id: 1 },
    update: {},
    create: { name: '电子数码' },
  });
  const phones = await prisma.category.upsert({
    where: { id: 2 },
    update: {},
    create: { name: '手机', parentId: electronics.id },
  });

  // 创建商品
  await prisma.product.createMany({
    skipDuplicates: true,
    data: [
      {
        name: 'iPhone 15 Pro',
        description: '苹果最新旗舰手机，搭载 A17 Pro 芯片',
        price: 8999,
        stock: 100,
        categoryId: phones.id,
        imageUrls: [],
      },
      {
        name: 'Samsung Galaxy S24',
        description: '三星旗舰，搭载骁龙 8 Gen 3',
        price: 6999,
        stock: 80,
        categoryId: phones.id,
        imageUrls: [],
      },
    ],
  });

  console.log('种子数据填充完成！');
  console.log('管理员账号: admin@ezserver.com / admin123456');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
```

在 `package.json` 的 `scripts` 中加入：
```json
"prisma:seed": "ts-node prisma/seed.ts"
```

运行：
```bash
npm run prisma:seed
```

### 步骤 7：编写 README.md

在 `EzServerSrc/` 目录下创建 `README.md`，描述项目、如何启动、如何测试。这对自己回顾或者他人接手都很重要。

```markdown
# EzServer

电商后台 API 服务

## 快速开始

1. 安装依赖：`npm install`
2. 配置环境变量：复制 `.env.example` 为 `.env` 并填写数据库等配置
3. 初始化数据库：`npm run prisma:migrate`
4. 填充种子数据：`npm run prisma:seed`
5. 启动开发服务：`npm run dev`

## API 文档

启动后访问：http://localhost:3000/api-docs

## 管理员账号（种子数据）

- 邮箱：admin@ezserver.com
- 密码：admin123456
```

---

## 验证阶段成果

### 1. 测试错误处理
```bash
# 访问一个不存在的路由
curl http://localhost:3000/api/nonexistent

# 期望：404 JSON 响应，而不是 HTML 错误页
```

### 2. 查看日志输出
启动服务，随便访问几个接口，观察终端里的 Morgan 日志格式。

### 3. 访问 Swagger 文档
打开浏览器，访问 `http://localhost:3000/api-docs`。

你应该看到一个可交互的 API 文档页面，可以直接在里面测试接口：
1. 先调用 `/api/auth/login` 获取 Token
2. 点击右上角的 "Authorize" 按钮，输入 Token
3. 现在可以测试需要认证的接口了

---

## 整体回顾：你的系统架构

经过 7 个阶段，你构建了一个完整的后端服务，架构如下：

```
HTTP 请求
    │
    ▼
┌─────────────────────────────────────┐
│           Express 中间件层           │
│  Morgan日志 → Helmet → CORS → Body解析│
└─────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────┐
│             路由层 (Routes)          │
│  /api/auth  /api/products           │
│  /api/cart  /api/orders             │
└─────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────┐
│           业务中间件层               │
│  authenticate → authorize → validate│
└─────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────┐
│          控制器层 (Controllers)      │
│     解析请求参数，调用 Service       │
└─────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────┐
│           服务层 (Services)          │
│        核心业务逻辑和规则             │
└─────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────┐
│         仓储层 (Repositories)        │
│           Prisma ORM 操作            │
└─────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────┐
│         PostgreSQL 数据库            │
└─────────────────────────────────────┘
```

---

## 完成标志

- [ ] 访问不存在的路由返回 404 JSON（不是 HTML）
- [ ] 数据库报错（如唯一约束冲突）返回友好的错误提示
- [ ] 终端能看到 Morgan 的请求日志
- [ ] 访问 `/api-docs` 能看到 Swagger 文档页面
- [ ] 所有接口都在 Swagger 里有文档
- [ ] `npm run prisma:seed` 能创建种子数据

---

## 恭喜完成！接下来可以探索的方向

完成这个项目后，你已经掌握了后端开发的核心知识体系。以下是进阶方向供参考：

### 性能优化
- **Redis 缓存**：把热点数据（商品列表、分类树）缓存到 Redis，减少数据库查询
- **数据库索引**：给频繁查询的字段（email、categoryId）加索引，提升查询速度

### 可靠性提升
- **单元测试**：用 Jest 写 Service 层的单元测试
- **集成测试**：用 Supertest 测试 API 接口
- **Graceful Shutdown**：服务关闭时等待正在处理的请求完成

### 进阶功能
- **WebSocket**：实现订单状态实时推送（Socket.io）
- **消息队列**：下单后异步发送确认邮件（RabbitMQ/Bull）
- **图片上传到云存储**：替换本地存储，使用阿里云 OSS / AWS S3

### 部署
- **Docker 容器化**：写 Dockerfile，用 docker-compose 启动整个服务
- **CI/CD**：用 GitHub Actions 实现自动化测试和部署

### 本地 HTTPS 开发（可选）

如果你在本地集成 Swagger 后发现它默认尝试用 `https://localhost:3000` 发送请求（或出于其他原因想让本地开发跑在 HTTPS 上），可以通过 `mkcert` 生成受信任的本地证书，然后让 Express 启动 HTTPS 服务。

#### 1. 安装 mkcert 并创建本地 CA

```bash
brew install mkcert
mkcert -install
```

#### 2. 生成本地证书

在项目根目录（如 `EzServerSrc/`）执行：

```bash
mkcert localhost 127.0.0.1 ::1
```

这会生成类似 `localhost+2.pem`（证书）和 `localhost+2-key.pem`（私钥）两个文件。

#### 3. 修改 `src/app.ts` 启动 HTTPS

```typescript
import https from 'https';
import fs from 'fs';

// ...其他 import 不变

const httpsOptions = {
  key: fs.readFileSync('localhost+2-key.pem'),
  cert: fs.readFileSync('localhost+2.pem'),
};

https.createServer(httpsOptions, app).listen(PORT, () => {
  console.log(`🚀 Server is running on https://localhost:${PORT}`);
  console.log(`📋 Health check: https://localhost:${PORT}/health`);
});
```

> **注意**：如果仍然保留 HTTP 的 `app.listen()`，需要把它删掉或注释掉，避免同时监听两个端口。

#### 4. 更新 Swagger 配置

把 `src/utils/swagger.ts` 里的 `servers.url` 改为：

```typescript
servers: [
  { url: 'https://localhost:3000', description: '本地开发环境' }
]
```

#### 5. 重启服务

```bash
npm run dev
```

此时访问 `https://localhost:3000/api-docs`，浏览器不会报红字证书警告，Swagger 的 "Try it out" 也能正常通过 HTTPS 发送请求。
