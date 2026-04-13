# Phase 3 - 用户认证模块（JWT）

## 学习目标

完成本阶段后，你将理解：
- 为什么不能明文存储密码，bcrypt 哈希的原理
- JWT（JSON Web Token）的结构、生成与验证原理
- HTTP 是无状态协议，后端如何识别"这个请求是哪个用户发的"
- 如何用 Express 中间件实现路由保护
- 如何规范后端 API 的错误响应

---

## 背景知识：为什么不能存明文密码？

假设你的数据库被黑客拖库（获取了整个数据库内容）。

- 如果密码是明文：黑客拿到密码后可以直接登录所有账号，甚至因为很多人重复使用密码，还能登录其他平台的账号。
- 如果密码是 MD5 哈希：黑客可以用**彩虹表**（预先计算好的哈希对照表）快速反查出原始密码。
- 如果密码是 bcrypt 哈希：bcrypt 专门为密码设计，有以下特点：
  1. **单向性**：无法从哈希值反推原始密码
  2. **加盐（Salt）**：每次哈希时加入随机数据，相同密码每次生成的哈希值都不一样，彩虹表完全失效
  3. **慢速计算**：故意设计成很慢（可配置），让暴力破解代价极高

---

## 背景知识：JWT 原理

你在做移动端时肯定调用过需要登录的接口，请求里会带一个 `Authorization: Bearer xxx` 的 Header。这个 `xxx` 就是 JWT Token。

### HTTP 是无状态的

HTTP 协议本身不记住任何东西。服务器收到请求时，默认不知道"这个请求是哪个用户发的"。

**解决方案：Token（令牌）机制**

1. 用户登录时，服务器验证密码，然后生成一个 Token（签名过的凭证），返回给客户端
2. 客户端把 Token 存起来（App 端通常存在 SharedPreferences / Keychain）
3. 此后每次请求都在 Header 里带上这个 Token
4. 服务器收到请求时，验证 Token 是否有效，从中解析出用户 ID

### JWT 的结构

JWT Token 看起来像这样：
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsImVtYWlsIjoidGVzdEBleGFtcGxlLmNvbSIsImlhdCI6MTcwMDAwMDAwMCwiZXhwIjoxNzAwNjA0ODAwfQ.abc123签名
```

它由三部分组成，用 `.` 分隔：
```
Header.Payload.Signature
```

- **Header**（Base64 编码）：说明签名算法，如 `{"alg":"HS256","typ":"JWT"}`
- **Payload**（Base64 编码）：存放数据，如用户 ID、角色、过期时间
- **Signature**：用服务器的密钥对 Header+Payload 进行签名，**防止篡改**

> **重要**：Payload 是 Base64 编码，不是加密！任何人都能解码看到里面的内容。所以不要把敏感信息（如密码）放进去。JWT 的安全性来自于 Signature——没有服务器密钥就无法伪造合法的签名。

你可以去 [jwt.io](https://jwt.io) 把上面那串 Token 粘贴进去，自己看看解码后的内容。

---

## 背景知识：错误处理规范

好的 API 应该有统一的错误响应格式，客户端才能写出通用的错误处理代码：

```json
// 成功响应
{
  "success": true,
  "data": { ... }
}

// 失败响应
{
  "success": false,
  "error": {
    "code": "INVALID_CREDENTIALS",
    "message": "邮箱或密码错误"
  }
}
```

我们会在这个阶段建立这套规范，并在后续所有模块中使用。

---

## 动手步骤

### 步骤 1：安装依赖

```bash
npm install jsonwebtoken bcryptjs
npm install -D @types/jsonwebtoken @types/bcryptjs
```

### 步骤 2：完善 .env

在 `.env` 中加入：
```
JWT_SECRET="your-super-secret-jwt-key-at-least-32-chars-long"
JWT_EXPIRES_IN="7d"
```

> **JWT_SECRET 安全要求**：至少 32 个字符的随机字符串。在生产环境里，这个密钥要妥善保管，泄露了就等于任何人都能伪造 Token。

### 步骤 3：创建环境变量工具

为了避免到处写 `process.env.JWT_SECRET!`（带叹号的 TypeScript 非空断言），创建一个统一的环境变量管理文件。

创建 `src/utils/env.ts`：

```typescript
// 这个函数从 process.env 读取环境变量
// 如果变量不存在，直接抛出错误并提示开发者
// 这样能在服务启动时就发现配置缺失，而不是运行时报错
function getEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`环境变量 ${key} 未设置，请检查 .env 文件`);
  }
  return value;
}

export const env = {
  PORT: parseInt(process.env.PORT || '3000', 10),
  NODE_ENV: process.env.NODE_ENV || 'development',
  DATABASE_URL: getEnv('DATABASE_URL'),
  JWT_SECRET: getEnv('JWT_SECRET'),
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
};
```

### 步骤 4：创建统一错误类

创建 `src/utils/AppError.ts`：

```typescript
// 自定义错误类，继承自 Error
// 携带 HTTP 状态码，方便错误处理中间件使用
export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number = 500,
    public code?: string
  ) {
    super(message);
    this.name = 'AppError';
    // 修复 TypeScript 继承 Error 时 instanceof 不正确的问题
    Object.setPrototypeOf(this, AppError.prototype);
  }
}
```

### 步骤 5：创建 JWT 工具函数

创建 `src/utils/jwt.ts`：

```typescript
import jwt from 'jsonwebtoken';
import { env } from './env';

export interface JwtPayload {
  userId: number;
  email: string;
  role: string;
}

// 生成 JWT Token
export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN,
  });
}

// 验证并解析 JWT Token
// 如果 Token 无效或已过期，jwt.verify 会抛出异常
export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, env.JWT_SECRET) as JwtPayload;
}
```

### 步骤 6：扩展 Express 的 Request 类型

Express 默认的 `req` 对象没有 `user` 属性。我们需要用 TypeScript 的**声明合并**来给它加上。

创建 `src/types/express.d.ts`：

```typescript


// 声明合并：扩展 express 包里 Request 接口
// 这样 req.user 就有 TypeScript 类型提示了
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}
```

### 步骤 7：创建 Auth 中间件

创建 `src/middlewares/auth.middleware.ts`：

```typescript
import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt';
import { AppError } from '../utils/AppError';

// 认证中间件：验证请求是否带有合法的 JWT Token
export function authenticate(req: Request, res: Response, next: NextFunction) {
  // 从 Header 中提取 Token
  // 标准格式：Authorization: Bearer <token>
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new AppError('未提供认证 Token', 401, 'UNAUTHORIZED'));
  }

  const token = authHeader.split(' ')[1];

  try {
    const payload = verifyToken(token);
    req.user = payload; // 把用户信息挂到 req 上，后续中间件可以使用
    next();
  } catch (error) {
    return next(new AppError('Token 无效或已过期', 401, 'TOKEN_INVALID'));
  }
}

// 角色权限中间件：检查用户是否有足够的权限
// 使用「工厂函数」模式，返回一个中间件函数
export function authorize(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError('未认证', 401, 'UNAUTHORIZED'));
    }
    if (!roles.includes(req.user.role)) {
      return next(new AppError('权限不足', 403, 'FORBIDDEN'));
    }
    next();
  };
}
```

> **工厂函数模式解释**：`authorize('ADMIN')` 返回的是一个中间件函数。用法如下：
> ```typescript
> router.delete('/products/:id', authenticate, authorize('ADMIN'), deleteProduct);
> ```
> 这样可以灵活组合多个角色，如 `authorize('ADMIN', 'MODERATOR')`。

### 步骤 8：创建全局错误处理中间件

创建 `src/middlewares/error.middleware.ts`：

```typescript
import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/AppError';

// Express 的错误处理中间件有 4 个参数（必须是 4 个，少了 Express 不识别）
export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code || 'ERROR',
        message: err.message,
      },
    });
  }

  // 未知错误（Bug），不暴露细节给客户端
  console.error('未知错误:', err);
  return res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: '服务器内部错误',
    },
  });
}
```

### 步骤 9：创建 Auth 相关的 Repository、Service、Controller

**Repository**（数据库操作层）

创建 `src/repositories/user.repository.ts`：

```typescript
import prisma from '../prisma';

export const userRepository = {
  // 根据邮箱查找用户
  findByEmail(email: string) {
    return prisma.user.findUnique({ where: { email } });
  },

  // 根据 ID 查找用户（不返回密码字段）
  findById(id: number) {
    return prisma.user.findUnique({
      where: { id },
      select: { id: true, email: true, name: true, role: true, avatarUrl: true, createdAt: true }
    });
  },

  // 创建用户
  create(data: { email: string; passwordHash: string; name: string }) {
    return prisma.user.create({ data });
  },
};
```

**Service**（业务逻辑层）

创建 `src/services/auth.service.ts`：

```typescript
import bcrypt from 'bcryptjs';
import { userRepository } from '../repositories/user.repository';
import { signToken } from '../utils/jwt';
import { AppError } from '../utils/AppError';

export const authService = {
  async register(email: string, password: string, name: string) {
    // 检查邮箱是否已注册
    const existing = await userRepository.findByEmail(email);
    if (existing) {
      throw new AppError('该邮箱已注册', 409, 'EMAIL_EXISTS');
    }

    // 对密码进行 bcrypt 哈希
    // 第二个参数 12 是「cost factor」，数值越大越安全但越慢
    // 12 是一个业界常用的平衡值，每次哈希约需 300ms
    const passwordHash = await bcrypt.hash(password, 12);

    const user = await userRepository.create({ email, passwordHash, name });

    const token = signToken({ userId: user.id, email: user.email, role: user.role });

    return {
      token,
      user: { id: user.id, email: user.email, name: user.name, role: user.role }
    };
  },

  async login(email: string, password: string) {
    // 查找用户
    const user = await userRepository.findByEmail(email);

    // 注意：即使用户不存在，也要执行 bcrypt.compare（虽然结果一定是 false）
    // 这是为了防止「时序攻击」：如果不存在时立刻返回，
    // 攻击者通过响应时间差异可以判断邮箱是否已注册
    const dummyHash = '$2a$12$dummyhashfortimingattackprevention00000000';
    const passwordHash = user?.passwordHash ?? dummyHash;
    const isValid = await bcrypt.compare(password, passwordHash);

    if (!user || !isValid) {
      throw new AppError('邮箱或密码错误', 401, 'INVALID_CREDENTIALS');
    }

    const token = signToken({ userId: user.id, email: user.email, role: user.role });

    return {
      token,
      user: { id: user.id, email: user.email, name: user.name, role: user.role }
    };
  },
};
```

**Controller**（HTTP 层）

创建 `src/controllers/auth.controller.ts`：

```typescript
import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth.service';

// Controller 只负责：
// 1. 从 req 中取出参数
// 2. 调用 Service
// 3. 把结果写入 res
// 不包含任何业务逻辑

export const authController = {
  async register(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password, name } = req.body;
      
      // 基础参数校验（Phase 4 会用 Zod 做更完善的校验）
      if (!email || !password || !name) {
        return res.status(400).json({
          success: false,
          error: { code: 'MISSING_FIELDS', message: '请填写所有必填字段' }
        });
      }

      const result = await authService.register(email, password, name);
      res.status(201).json({ success: true, data: result });
    } catch (error) {
      next(error); // 把错误传给错误处理中间件
    }
  },

  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password } = req.body;
      const result = await authService.login(email, password);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  },

  async getMe(req: Request, res: Response, next: NextFunction) {
    try {
      res.json({ success: true, data: req.user });
    } catch (error) {
      next(error);
    }
  },
};
```

### 步骤 10：创建路由

创建 `src/routes/auth.routes.ts`：

```typescript
import { Router } from 'express';
import { authController } from '../controllers/auth.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();

router.post('/register', authController.register);
router.post('/login', authController.login);
router.get('/me', authenticate, authController.getMe);  // 需要认证

export default router;
```

### 步骤 11：更新 app.ts

将路由和错误处理中间件注册到 Express App：

```typescript
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.routes';
import { errorHandler } from './middlewares/error.middleware';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(helmet());
app.use(cors());
app.use(express.json());

// 路由
app.use('/api/auth', authRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// 错误处理中间件必须放在所有路由之后
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
});

export default app;
```

---

## 用 Postman 测试

### 1. 注册
```
POST http://localhost:3000/api/auth/register
Content-Type: application/json

{
  "email": "test@example.com",
  "password": "password123",
  "name": "测试用户"
}
```

期望响应：
```json
{
  "success": true,
  "data": {
    "token": "eyJhbG...",
    "user": { "id": 1, "email": "test@example.com", "name": "测试用户", "role": "USER" }
  }
}
```

### 2. 登录
```
POST http://localhost:3000/api/auth/login
Content-Type: application/json

{
  "email": "test@example.com",
  "password": "password123"
}
```

### 3. 获取当前用户信息（需要带 Token）
```
GET http://localhost:3000/api/auth/me
Authorization: Bearer <上一步拿到的 token>
```

### 4. 测试无 Token 访问
不带 Authorization Header 直接访问 `/api/auth/me`，应该返回 401 错误。

### 5. 测试错误密码
使用错误密码登录，应该返回 401 且不暴露"密码错误"还是"用户不存在"（统一提示"邮箱或密码错误"）。

---

## 阶段小结

| 概念 | 本质 |
|------|------|
| bcrypt | 专为密码设计的单向哈希算法，加盐+慢速，防止彩虹表和暴力破解 |
| JWT | 服务端签发的、包含用户信息的令牌，无需服务端存储 Session |
| 认证中间件 | 在路由处理前校验 Token，相当于门卫 |
| 三层架构 | Controller 处理 HTTP → Service 处理业务 → Repository 处理数据库 |

---

## 完成标志

- [X] 注册接口返回 token 和用户信息
- [X] 登录接口正常工作
- [X] 带正确 Token 可以访问 `/api/auth/me`
- [X] 不带 Token 访问受保护接口返回 401
- [X] 理解为什么登录失败不区分"用户不存在"和"密码错误"

完成后，进入 [Phase 4 - 商品模块](./phase4-product.md)。
