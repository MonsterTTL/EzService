# 知识盲区追踪

> 记录学习过程中暴露出的知识空白，持续更新。
> 每个条目标注了**理解状态**，方便复盘查漏补缺。

---

## 理解状态说明

| 标记 | 含义 |
|------|------|
|| ✅ 已理解 | 提问后已搞清楚，能用自己的话解释 |
|| 🔄 部分理解 | 大概明白，但实际用的时候可能还会懵 |
|| ❓ 待深入 | 知道是什么，但原理没搞透 |

---

## Phase 1 — 项目脚手架

### Node.js / npm

| 知识点 | 理解状态 | 备注 |
|--------|--------|------|
|| `npm init` / `npm init -y` 只生成 `package.json`，不会安装任何东西，也不会启动服务 | ✅ 已理解 | 类比 `build.gradle`，是项目的"身份证+说明书" |
|| `package.json` 中 `dependencies` vs `devDependencies` 的区别 | ✅ 已理解 | 运行时 vs 编译期；类比 Android 的 `implementation` vs `annotationProcessor` |
|| `npm install -D` 的含义（`--save-dev`） | ✅ 已理解 | 写入 `devDependencies` |
|| `npm install --production` 只安装运行时依赖 | 🔄 部分理解 | 知道结论，部署时实际操作过才算真懂 |
|| `package-lock.json` 是什么，为什么存在 | ❓ 待深入 | 锁定依赖版本，保证不同机器安装结果一致 |
|| `node_modules` 里为什么有大量你没直接安装的包 | ✅ 已理解 | 间接依赖（传递依赖），npm 自动处理，不应手动写进 `package.json` |

---

### TypeScript 编译配置（tsconfig.json）

| 知识点 | 理解状态 | 备注 |
|--------|--------|------|
|| `target` — 编译输出的 JS 语法版本 | ✅ 已理解 | Node 18 支持 ES2020，不需要降级 |
|| `module: "commonjs"` — Node.js 使用 CommonJS 模块系统 | ✅ 已理解 | 输出 `require()` 格式，不是 ESM 的 `import` |
|| `outDir` / `rootDir` — 输出目录与源码目录 | ✅ 已理解 | `.ts` 在 `src/`，编译后 `.js` 放 `dist/` |
|| `strict: true` — 开启严格类型检查 | 🔄 部分理解 | 知道是严格模式，具体报哪些错还不清楚 |
|| `esModuleInterop: true` — 让 `import x from 'x'` 写法能用于 CommonJS 包 | ✅ 已理解 | 不开启的话要写 `import * as express from 'express'` |
|| `skipLibCheck: true` — 跳过 `.d.ts` 类型声明文件的检查 | 🔄 部分理解 | 主要是为了避免第三方类型定义的误报 |
|| `sourceMap: true` — 生成源码映射文件 | ✅ 已理解 | 类比 Android ProGuard mapping，让报错行号指向 TS 源码而非编译后的 JS |
|| `include` / `exclude` — 告诉编译器哪些文件要编译 | ✅ 已理解 | `src/**/*` 递归匹配所有文件；排除 `node_modules` 和 `dist` |
|| `jsx` 选项是 React 专用的，Node.js 后端不需要 | ✅ 已理解 | 误配会导致报错 |
|| `verbatimModuleSyntax: true` 与 `module: commonjs` 冲突 | ✅ 已理解 | TS 5.x 会直接报错，不能同时使用 |
|| `types: []` 空数组会屏蔽所有 `@types/*` 包 | ✅ 已理解 | 导致 `@types/node`、`@types/express` 全部失效 |

---

### Express / HTTP 基础

| 知识点 | 理解状态 | 备注 |
|--------|--------|------|
|| `app.get(path, handler)` 是注册路由，不是内置功能 | ✅ 已理解 | 所有路由都是手动注册的 |
|| `req`（Request）和 `res`（Response）的角色 | ✅ 已理解 | 后端视角：`req` 是收到的请求，`res` 是你要写回的响应 |
|| `res.json()` 自动序列化对象并设置 `Content-Type: application/json` | ✅ 已理解 | |
|| 浏览器地址栏 = 发起 GET 请求 | ✅ 已理解 | 所以只有 GET 接口能在浏览器直接测试 |
|| POST / PUT / DELETE 接口需要用 Postman 测试 | ✅ 已理解 | 浏览器地址栏无法发起这些方法 |
|| `/health` 健康检查接口是后端通用惯例，不是框架内置 | ✅ 已理解 | 供监控系统、负载均衡器探测服务是否存活 |
|| Express 中间件机制（`Request → Middleware Chain → Response`） | ❓ 待深入 | 知道概念，还没写过自定义中间件 |
|| 跨域（CORS）是什么，为什么存在 | ✅ 已理解 | 浏览器同源策略的安全限制；服务器加响应头 `Access-Control-Allow-Origin` 解决；App/Postman 不受影响 |
|| `cors` 中间件的作用 | ✅ 已理解 | 自动给每个响应加 CORS 响应头；生产环境应限定具体域名 |

---

## Phase 2 — 数据库设计（进行中）

### 关系型数据库

| 知识点 | 理解状态 | 备注 |
|--------|--------|------|
|| 主键（Primary Key）是什么 | ✅ 已理解 | 唯一标识一行数据的字段；不能重复、不能为空、不能改变；项目里用自增 id |
|| 外键 = 用另一张表的主键 ID 来引用那条数据 | ✅ 已理解 | 避免数据冗余，是关系型数据库拆表的核心机制 |
|| 索引是什么 | ❓ 待深入 | |
|| 为什么电商用关系型数据库而不是 MongoDB | ✅ 已理解 | 电商数据关联复杂（用户→订单→商品→分类），关系型拆表+外键避免冗余；MongoDB 适合结构灵活、关联简单的场景 |
|| 数据冗余问题：同一份数据存多份导致更新困难 | ✅ 已理解 | 关系型数据库用拆表+ID引用解决这个问题 |
|| 数据库迁移（Migration）是什么，为什么重要 | ✅ 已理解 | 把每次 Schema 变更记录为带时间戳的 SQL 文件；保证团队/生产环境结构同步，可回滚 |
|| 价格快照（priceSnapshot）的意义 | ✅ 已理解 | 商品价格会变，下单时必须把当时的价格快照存进 order_items；否则历史订单金额会随现价变动而错乱 |

### Prisma ORM

| 知识点 | 理解状态 | 备注 |
|--------|--------|------|
|| Docker 容器是什么 | ✅ 已理解 | 把软件+运行环境打包在一起，保证不同机器行为一致；类比 APK |
|| PostgreSQL 是数据库本身（存数据的） | ✅ 已理解 | 跑在 Docker 容器或服务器上 |
|| Prisma 是 ORM，不是数据库 | ✅ 已理解 | 跑在 Node.js 代码里，把 TS 方法调用翻译成 SQL 发给 PostgreSQL |
|| ORM 的作用：用代码操作数据库，不用写 SQL | ✅ 已理解 | 全程类型安全，有自动补全；`prisma.user.findMany()` 自动生成 SQL |
|| `schema.prisma` 定义数据模型 | ✅ 已理解 | 用 Prisma Schema 语法声明 model、字段类型、关联关系、约束 |
|| Prisma 关系字段（`@relation`）vs 真实列 | ✅ 已理解 | 带 `@relation` 的字段是虚拟的，数据库里没有对应列；`include` 时才触发 JOIN；谁拥有外键列谁写完整 `@relation` |
|| 反向引用字段（如 `items CartItem[]`）不需要写 `@relation` | ✅ 已理解 | 外键不在这边，Prisma 自动推断；类比 Room 的 `@Relation` |
|| JS 模块导出值 = 天然单例 | ✅ 已理解 | Node.js 模块只执行一次，之后 import 都返回缓存；`new PrismaClient()` 在模块顶层只调用一次，全局共享同一连接池 |
|| 工厂函数 vs 导出实例 | ✅ 已理解 | 导出值 → 单例；导出函数 → 每次调用新实例；Next.js 热重载场景需要工厂函数+globalThis 防止连接数耗尽 |
|| PrismaClient 单例的状态隔离 | ✅ 已理解 | 普通查询无状态污染，各查询从连接池独立取连接；`$transaction(tx => {})` 的 `tx` 是独立作用域，事务结束后销毁 |
|| `prisma migrate dev` 执行迁移 | 🔄 部分理解 | 命令跑通了；原理是对比 Schema diff 生成 SQL 文件并执行，同时自动触发 `generate` |
|| `prisma generate` 是什么，什么时候单独跑 | ✅ 已理解 | 读取 schema.prisma 生成 TS 类型到 `node_modules/.prisma/client/`；migrate 中途失败时需要手动单独运行 |
|| `generator client` 的 `output` 选项陷阱 | ✅ 已理解 | 设置 `output` 会把 Client 生成到自定义路径，但 `import from '@prisma/client'` 找默认路径，导致 `did not initialize` 报错；`prisma-client-js` 不要设置 `output` |
|| `ts-node` 是什么 | ✅ 已理解 | 在内存里动态编译 TS 并直接运行，不生成 `.js` 文件；省去 `tsc → node` 两步；适合执行一次性脚本 |
|| `npx` 是什么 | ✅ 已理解 | 运行本地 `node_modules/.bin/` 里的命令，不需要全局安装 |
|| Prisma Client 的 CRUD 操作 | 🔄 部分理解 | `create`、`findMany`、`findFirst`、`update`、`delete` 写过；`include`（带 JOIN）vs `select`（只查指定字段）理解了区别 |
|| imageUrls 存的是 HTTP URL，不是文件路径 | ✅ 已理解 | 客户端上传 → 服务端保存文件 → 生成可访问的 HTTP URL 存入数据库；Phase 4 实现文件上传 |

---

## Phase 3 — 用户认证（未开始）

| 知识点 | 理解状态 | 备注 |
|--------|--------|------|
|| bcrypt 密码哈希原理 | ❓ 待深入 | |
|| JWT 结构（Header.Payload.Signature） | ✅ 已理解 | Header=算法声明、Payload=Base64用户数据（非加密）、Signature=密钥签名防篡改；服务端颁发+验证流程清楚 |
|| Bearer Token 的传递方式 | ✅ 已理解 | 请求 Header 里带 `Authorization: Bearer <token>`，服务端中间件提取后验签 |
|| Express 认证中间件如何注入 `req.user` | ❓ 待深入 | |

---

## Phase 4 — 商品模块（进行中）

| 知识点 | 理解状态 | 备注 |
|--------|--------|------|
|| Controller-Service-Repository 三层架构各层职责 | ✅ 已理解 | Controller（薄层）：解析 HTTP 请求、调用 Service、格式化响应；Service（厚层）：业务规则验证、逻辑编排、抛出业务异常；Repository（薄层）：纯数据库查询，无业务逻辑 |
|| Zod 做请求体校验的用法 | ✅ 已理解 | 定义 Schema 约束字段类型，用 `validate()` 中间件在路由中执行；校验通过后会将转换后的数据写回 `req.body`，所以 Controller 可以直接传给 Service |
|| Zod 的 `coerce` 是什么 | ✅ 已理解 | 自动类型转换，如把 query string 的 `"1"` 转成数字 `1`；常用于 `req.query` 的参数转换 |
|| Request 对象各参数的区别 | ✅ 已理解 | `params`：URL 路径参数（如 `/products/:id`）；`query`：`?` 后的过滤条件；`body`：POST/PUT 请求体；`files`：multer 处理的文件；`headers`：HTTP 请求头 |
|| Path Param vs Query Param 的使用场景 | ✅ 已理解 | Path Param 用于资源唯一标识（如 `/products/123`）；Query Param 用于过滤、分页、搜索（如 `?page=1&keyword=phone`） |
|| Multer 文件上传原理 | ❓ 待深入 | |
|| 分页查询的两种实现方式 | 🔄 部分理解 | Offset 分页（页码跳转，简单但有性能问题）；Cursor 分页（游标，性能好但不能跳页） |
|| `express.static` 静态文件服务 | 🔄 部分理解 | 把本地目录映射为 HTTP 可访问路径，让上传的图片能通过 URL 访问 |

---

## Phase 5-6 — 购物车 / 订单（未开始）

| 知识点 | 理解状态 | 备注 |
|--------|--------|------|
|| 数据库事务（Transaction）是什么，为什么需要 | ❓ 待深入 | |
|| 库存并发问题（超卖）的解决思路 | ❓ 待深入 | |
|| 订单状态机设计 | ❓ 待深入 | |

---

## Phase 7 — 工程化收尾（未开始）

| 知识点 | 理解状态 | 备注 |
|--------|--------|------|
|| 全局错误处理中间件设计 | ❓ 待深入 | |
|| Morgan 日志中间件 | ❓ 待深入 | |
|| Swagger / OpenAPI 文档生成 | ❓ 待深入 | |
|| `.env` 环境变量类型安全封装 | ❓ 待深入 | |

---

## 后续学习计划

| 优先级 | 目标 | 说明 |
|--------|------|------|
|| ⭐ 完成 EzServer 后 | **用 Next.js 做一个全栈项目** | 前端 SSR + 调用 EzServer 的 API，把服务端渲染、SEO 优化、前后端联调都跑通一遍 |

---

*最后更新：Phase 4 进行中 — 已理解 Controller-Service-Repository 架构、Zod 校验、Request 参数区别等概念*
