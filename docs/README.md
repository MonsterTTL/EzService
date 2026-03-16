# EzServer 学习项目总览

## 项目简介

你是一名客户端开发工程师，本项目将带你以**亲手动手**的方式学习后端开发的核心知识。

我们将构建一个简化的**电商后台 API 服务**，它最终可以直接被你的手机 App 调用。

---

## 技术栈

| 技术 | 用途 | 选择理由 |
|------|------|----------|
| **Node.js 18+** | 运行时 | 非浏览器环境下运行 JS |
| **TypeScript** | 开发语言 | 你有 RN 经验，TS 类型系统非常熟悉 |
| **Express.js** | HTTP 框架 | 最经典极简，把 HTTP 本质看得最清楚 |
| **PostgreSQL** | 数据库 | 关系型数据库，电商场景的首选 |
| **Prisma ORM** | 数据库访问层 | TypeScript-first，类型提示极佳 |
| **JWT** | 用户鉴权 | 移动端最常打交道的认证方案，这次从服务端视角理解 |
| **Zod** | 请求参数校验 | TS 生态最流行的 schema 验证库 |

---

## 目录结构（最终形态）

```
EzServerSrc/
├── src/
│   ├── controllers/       # 处理 HTTP 请求/响应（薄层）
│   ├── services/          # 核心业务逻辑
│   ├── repositories/      # 数据库访问层
│   ├── middlewares/       # 中间件（auth、错误处理、日志）
│   ├── routes/            # 路由定义
│   ├── types/             # TypeScript 类型定义
│   ├── utils/             # 工具函数
│   └── app.ts             # Express 应用入口
├── prisma/
│   ├── schema.prisma      # 数据库 Schema 定义
│   └── seed.ts            # 初始种子数据
├── uploads/               # 上传文件存储目录
├── .env                   # 环境变量（不提交 git）
├── .env.example           # 环境变量模板（提交 git）
├── .gitignore
├── package.json
└── tsconfig.json
```

---

## 学习阶段路线图

```
Phase 1  ──▶  Phase 2  ──▶  Phase 3  ──▶  Phase 4
脚手架搭建    数据库设计    用户认证(JWT)   商品模块
                                              │
                                              ▼
Phase 7  ◀──  Phase 6  ◀──  Phase 5
工程化收尾    订单模块      购物车模块
```

| 阶段 | 主题 | 核心知识点 |
|------|------|-----------|
| [Phase 1](./phase1-scaffold.md) | 项目脚手架 | Node.js 运行原理、TypeScript 编译、HTTP 生命周期 |
| [Phase 2](./phase2-database.md) | 数据库设计 | 关系型数据库、ORM、数据库迁移 |
| [Phase 3](./phase3-auth.md) | 用户认证 | 密码哈希、JWT、Express 中间件 |
| [Phase 4](./phase4-product.md) | 商品模块 | 三层架构、请求校验、文件上传 |
| [Phase 5](./phase5-cart.md) | 购物车模块 | 数据库事务、并发问题 |
| [Phase 6](./phase6-order.md) | 订单模块 | 事务原子性、状态机、价格快照 |
| [Phase 7](./phase7-polish.md) | 工程化收尾 | 错误处理、日志、API 文档 |

---

## 完成后你将拥有

- 完整的 RESTful API（20+ 个接口）
- 规范的 JWT 鉴权体系
- 数据库 Schema + 版本化迁移文件
- 可在浏览器访问的 Swagger API 文档页面
- 一套可以被你的 App 直接调用的后端服务

---

## 前置环境要求

在开始之前，请确保你的机器上已安装：

1. **Node.js 18+**（通过 nvm 管理版本最佳）
2. **PostgreSQL**（Phase 2 时安装，推荐用 Docker）
3. **VSCode 或 Cursor**（用于编写代码）
4. **Postman 或 curl**（用于测试 API 接口）

检查 Node 版本：
```bash
node -v   # 应该输出 v18.x.x 或更高
npm -v    # 应该输出 9.x.x 或更高
```

> 如果你的 Node 版本低于 18，通过 nvm 安装并切换：
> ```bash
> nvm install 18
> nvm use 18
> nvm alias default 18   # 设置为默认版本
> ```

---

## 学习建议

1. **每个阶段独立完成**，完成一个阶段后确认能运行再进入下一个
2. **遇到报错不要慌**，后端开发报错是家常便饭，学会读错误信息是核心技能
3. **理解每一行代码为什么这么写**，比写出来更重要
4. **用 Postman 测试每个接口**，养成接口联调的习惯
