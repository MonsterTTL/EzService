# Phase 1 - 项目脚手架搭建

## 学习目标

完成本阶段后，你将理解：
- Node.js 是如何运行 JavaScript/TypeScript 的
- `package.json` 里每个字段的含义
- TypeScript 为什么需要编译，`tsconfig.json` 关键配置的作用
- Express 的工作原理：请求是如何一步步被处理的
- 什么是**中间件（Middleware）**，它和 Android 的拦截器有何异同

---

## 背景知识：Node.js 是什么？

作为 Android 开发者，你的代码运行在 JVM 上。Node.js 的作用类似 JVM，只不过它是专门为 JavaScript 设计的**运行时（Runtime）**。

- **浏览器里的 JS**：受沙盒限制，不能访问文件系统、不能直接监听 TCP 端口
- **Node.js 里的 JS**：可以做几乎所有系统级操作，就像写 Java 后端一样

Node.js 的核心特点：**单线程 + 事件循环（Event Loop）+ 非阻塞 I/O**。

这意味着：虽然 Node.js 是单线程的，但它可以高效地处理大量并发请求，原因是它不会"等待" I/O 操作（读文件、查数据库），而是发起操作后立刻去处理别的请求，等 I/O 完成后再通过回调/Promise 处理结果。

---

## 背景知识：HTTP 请求的生命周期

作为客户端开发者，你对"发请求"非常熟悉。现在来看服务端视角：

```
客户端 App
    │
    │ HTTP Request (POST /api/auth/login)
    │ Headers: Content-Type: application/json
    │ Body: { "email": "...", "password": "..." }
    ▼
Node.js HTTP Server (监听 3000 端口)
    │
    ▼
Express Router（根据路径 + 方法找到对应处理函数）
    │
    ▼
Middleware 1: 日志记录（记录这次请求）
    │
    ▼
Middleware 2: JSON 解析（把 Body 的字符串变成 JS 对象）
    │
    ▼
Middleware 3: 鉴权检查（检查 JWT Token）
    │
    ▼
Controller（执行业务逻辑，查数据库）
    │
    ▼
HTTP Response (200 OK, JSON Body)
    │
    ▼
客户端 App 收到响应
```

**中间件（Middleware）** 就是这个链条上的每一个处理环节。每个中间件接收 `(req, res, next)` 三个参数：
- `req`：请求对象（包含 URL、Headers、Body 等）
- `res`：响应对象（用来发送响应）
- `next()`：调用后继续执行下一个中间件；如果不调用 `next()`，请求就在这里"卡住"了

这和 Android OkHttp 的 `Interceptor` 原理完全一致！

---

## 动手步骤

### 步骤 1：进入工作目录

```bash
cd /Users/你的用户名/Desktop/EzServer/EzServerSrc
```

> **注意**：后续所有命令都在 `EzServerSrc/` 目录下执行。

---

### 步骤 2：初始化 package.json

```bash
npm init -y
```

这会生成一个 `package.json`。`-y` 表示所有问题都用默认值。

打开它，你会看到：
```json
{
  "name": "ezserver",
  "version": "1.0.0",
  "main": "index.js",
  ...
}
```

**修改** `package.json`，加入 `scripts` 和删掉不需要的字段，最终应该是：

```json
{
  "name": "ezserver",
  "version": "1.0.0",
  "description": "EzServer - 电商后台 API 学习项目",
  "scripts": {
    "dev": "ts-node-dev --respawn --transpile-only src/app.ts",
    "build": "tsc",
    "start": "node dist/app.js"
  }
}
```

**scripts 解释：**
- `dev`：开发模式启动，使用 `ts-node-dev`（相当于 TypeScript 版的 `nodemon`，文件改动自动重启）
- `build`：把 TypeScript 编译成 JavaScript，输出到 `dist/` 目录
- `start`：生产环境运行编译后的 JS

---

### 步骤 3：安装依赖

```bash
# 运行时依赖（打包进生产环境）
npm install express cors helmet morgan dotenv

# 开发时依赖（仅用于开发，不进生产）
npm install -D typescript ts-node-dev @types/node @types/express @types/cors @types/morgan
```

安装完后 `package.json` 会自动更新，`node_modules/` 目录会被创建。

**每个包的作用：**

| 包名 | 作用 |
|------|------|
| `express` | HTTP 框架，负责路由和中间件 |
| `cors` | 处理跨域请求（Cross-Origin Resource Sharing） |
| `helmet` | 自动设置安全相关的 HTTP Headers |
| `morgan` | HTTP 请求日志中间件 |
| `dotenv` | 从 `.env` 文件加载环境变量 |
| `typescript` | TypeScript 编译器 |
| `ts-node-dev` | 开发时直接运行 TS 文件（不需要先编译） |
| `@types/xxx` | 为对应的 JS 包提供 TypeScript 类型定义 |

> **为什么有些包要加 `-D`（devDependencies）？**
> 
> `typescript`、`ts-node-dev` 只在你开发时需要，部署到生产服务器后运行的是编译好的 JS，不需要这些工具。这样可以减小生产环境的包体积。Android 的 `debugImplementation` 和这个概念是一样的。

---

### 步骤 4：配置 TypeScript

```bash
npx tsc --init
```

这会生成 `tsconfig.json`。打开它，内容非常多，但大多数都被注释掉了。

**你需要修改的关键配置：**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

**关键字段解释：**

- `target: "ES2020"`：编译输出的 JS 语法版本。Node 18 支持 ES2020，所以不需要降级。
- `module: "commonjs"`：Node.js 使用 CommonJS 模块系统（`require`/`module.exports`），而不是 ES Module（`import`/`export`）。这里告诉编译器输出 CommonJS 格式。
- `outDir: "./dist"`：编译后的 JS 文件输出到 `dist/` 目录。
- `rootDir: "./src"`：TS 源码在 `src/` 目录。
- `strict: true`：开启严格模式，TypeScript 的类型检查会更严格，有助于写出更健壮的代码。
- `esModuleInterop: true`：让你可以用 `import express from 'express'` 而不是 `import * as express from 'express'`。

---

### 步骤 5：创建 .gitignore

创建 `.gitignore` 文件，写入以下内容：

```
node_modules/
dist/
.env
uploads/
```

> **为什么 `.env` 不能提交到 git？**
> 
> `.env` 里存放的是数据库密码、JWT 密钥等敏感信息。如果提交到 GitHub，任何人都能看到。实际工程中，这是一个非常严重的安全问题。
> 
> 正确做法是：提交一个 `.env.example` 文件，里面是变量名但没有真实值，让其他开发者参照这个文件创建自己的 `.env`。

---

### 步骤 6：创建 .env 文件

```
PORT=3000
NODE_ENV=development
```

Phase 2 之后会往里面加更多内容。

---

### 步骤 7：创建目录结构

```bash
mkdir -p src/controllers src/services src/repositories src/middlewares src/routes src/types src/utils
```

---

### 步骤 8：编写第一个 Express 服务

创建 `src/app.ts`，按照下面的结构和注释来理解每一行的作用：

```typescript
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';

// 加载 .env 文件中的环境变量到 process.env
// 必须在所有其他代码之前调用
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// ====== 中间件注册 ======
// 每次请求都会按顺序经过这些中间件

// 安全 HTTP Headers（防止常见 Web 攻击）
app.use(helmet());

// 处理跨域请求（允许其他域名的前端/App 调用这个 API）
app.use(cors());

// 把请求体（Body）从 JSON 字符串解析成 JS 对象
// 没有这行，req.body 会是 undefined
app.use(express.json());

// ====== 路由 ======

// 健康检查接口：用来确认服务是否正常运行
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    message: 'EzServer is running!',
    timestamp: new Date().toISOString(),
  });
});

// ====== 启动服务器 ======
app.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
  console.log(`📋 Health check: http://localhost:${PORT}/health`);
});

export default app;
```

---

### 步骤 9：启动并验证

```bash
npm run dev
```

你应该看到：
```
🚀 Server is running on http://localhost:3000
📋 Health check: http://localhost:3000/health
```

打开浏览器访问 `http://localhost:3000/health`，应该看到：
```json
{
  "status": "ok",
  "message": "EzServer is running!",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

**恭喜！你的第一个后端服务成功运行了。**

---

## 动手实验：理解中间件

在 `app.ts` 的 `app.use(express.json())` 之后加入以下代码来观察中间件的执行顺序：

```typescript
// 这是一个自定义的日志中间件
app.use((req: Request, res: Response, next: NextFunction) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next(); // 必须调用 next()，否则请求会卡在这里
});
```

再次访问 `/health`，观察终端输出。然后尝试**去掉 `next()`**，看看会发生什么（浏览器会一直转圈）。

---

## 阶段小结

| 概念 | 类比（Android） | 本质 |
|------|----------------|------|
| Node.js | JVM | JS 的运行时环境 |
| npm | Gradle | 包管理器 |
| `package.json` | `build.gradle` | 项目配置和依赖声明 |
| Express 中间件 | OkHttp Interceptor | 请求处理链上的一个环节 |
| `req` / `res` | Request / Response | HTTP 请求和响应对象 |

---

## 完成标志

- [ ] `npm run dev` 能成功启动，无报错
- [ ] 访问 `http://localhost:3000/health` 返回正确的 JSON
- [ ] 能理解 `app.use()` 和 `app.get()` 的区别
- [ ] 理解为什么中间件的 `next()` 至关重要

完成后，进入 [Phase 2 - 数据库设计](./phase2-database.md)。
