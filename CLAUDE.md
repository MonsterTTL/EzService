# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目背景

EzServer 是一个电商后端 API 学习项目，用户是中级 Android + 初级 iOS 开发者，具有 React Native 经验，正在学习 Node.js 后端开发。

这是一个教育性质的项目，Claude 的角色是资深全栈工程师导师：
- 详实地讲解原理，确保用户理解
- 发现代码错误时不要直接修改，而是指导用户修改
- 当学习进度变化时更新 `docs/knowledge-gaps.md`
- 重要知识背景补充进 `docs/` 下的附录文件中

## 常用命令

所有命令都在 `EzServerSrc/` 目录下执行：

```bash
# 开发（热重载）
npm run dev

# TypeScript 编译
npm run build

# 生产运行（需先 build）
npm start

# 数据库迁移（开发环境）
npx prisma migrate dev

# 生成 Prisma Client（迁移失败时手动执行）
npx prisma generate

# 打开 Prisma Studio（数据库 GUI）
npx prisma studio

# 执行 Prisma seed
npx prisma db seed
```

## 技术栈

- **运行时**: Node.js 18+ + TypeScript
- **HTTP 框架**: Express.js
- **数据库**: PostgreSQL + Prisma ORM
- **认证**: JWT (jsonwebtoken)
- **校验**: Zod
- **文件上传**: Multer

## 架构概览

### 三层架构

项目采用 Controller-Service-Repository 三层架构：

```
HTTP Request → Routes → Middleware → Controller → Service → Repository → Database
                                              ↓
HTTP Response ← JSON ← Controller ← Service ←
```

| 层级 | 职责 | 示例文件 |
|------|------|----------|
| **Controller** | 解析 HTTP 请求/响应，薄层，无业务逻辑 | `src/controllers/*.controller.ts` |
| **Service** | 核心业务逻辑、规则验证、异常抛出 | `src/services/*.service.ts` |
| **Repository** | 纯数据库访问，无业务逻辑 | `src/repositories/*.repository.ts` |

### 关键目录

```
EzServerSrc/
├── src/
│   ├── app.ts                 # Express 应用入口
│   ├── controllers/           # 控制器（处理 HTTP）
│   ├── services/              # 业务逻辑层
│   ├── repositories/          # 数据库访问层
│   ├── middlewares/           # Express 中间件
│   │   ├── auth.middleware.ts     # JWT 认证
│   │   ├── error.middleware.ts    # 全局错误处理
│   │   ├── upload.middleware.ts   # 文件上传（Multer）
│   │   └── validate.middleware.ts # Zod 请求校验
│   ├── routes/                # 路由定义
│   ├── types/                 # TypeScript 类型 + Zod Schemas
│   └── utils/                 # 工具函数（jwt.ts, AppError.ts, env.ts）
├── prisma/
│   └── schema.prisma          # 数据库 Schema 定义
├── uploads/                   # 上传文件存储目录
└── .env                       # 环境变量
```

### 中间件执行顺序（app.ts）

1. `helmet()` - HTTP 安全头
2. `cors()` - 跨域处理
3. `express.json()` - JSON 请求体解析
4. 路由处理
5. `errorHandler` - 全局错误处理（末尾）

### 数据流示例

```typescript
// Route 定义路由 + 中间件
router.post('/', authenticate, validate(createProductSchema), productController.create);

// Controller 解析请求，调用 Service
const create = async (req: Request, res: Response) => {
    const product = await productService.createProduct(req.body);
    res.status(201).json({ success: true, data: product });
};

// Service 处理业务逻辑
const createProduct = async (data: CreateProductInput) => {
    // 业务验证...
    return await productRepository.create(data);
};

// Repository 执行数据库操作
const create = async (data: CreateProductInput) => {
    return await prisma.product.create({ data });
};
```

## 开发注意事项

### 环境变量

关键变量在 `.env` 中：
- `DATABASE_URL` - PostgreSQL 连接字符串
- `JWT_SECRET` - JWT 签名密钥
- `JWT_EXPIRES_IN` - Token 过期时间
- `PORT` - 服务端口（默认 3000）

### 数据库关系

Prisma Schema 中的关系：
- 带 `@relation` 的字段是**虚拟字段**，数据库中无对应列
- 外键列所在侧写完整 `@relation`，反向引用侧不写
- 查询时用 `include` 触发 JOIN，用 `select` 指定返回字段

### 文件上传

- 使用 Multer 中间件处理文件上传
- 文件保存在 `uploads/` 目录
- 数据库 `imageUrls` 存的是 HTTP URL，不是本地路径
- `express.static` 将 uploads 目录映射为可访问的 URL

### 认证流程

1. 登录/注册时生成 JWT Token
2. 受保护路由使用 `authenticate` 中间件
3. 中间件验证 Token 并将 `user` 注入 `req`
4. Controller 通过 `req.user` 获取当前用户

## 文档索引

项目文档在 `docs/` 目录：

| 文档 | 内容 |
|------|------|
| `README.md` | 项目总览、学习路线图 |
| `knowledge-gaps.md` | 知识盲区追踪（需持续更新） |
| `phase1-scaffold.md` ~ `phase7-polish.md` | 各阶段学习指南 |
| `appendix-*.md` | 附录（数据库基础、Prisma CRUD 速查等） |

## 当前学习进度

参考 `docs/knowledge-gaps.md` 中的阶段划分：
- ✅ Phase 1: 项目脚手架
- ✅ Phase 2: 数据库设计
- ✅ Phase 3: 用户认证
- ✅ Phase 4: 商品模块
- 🔄 Phase 5: 购物车模块（进行中）
- ⏳ Phase 6: 订单模块
- ⏳ Phase 7: 工程化收尾
