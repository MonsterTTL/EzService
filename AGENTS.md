# AGENTS.md — EzServer 项目编码规范

> 本项目为电商后端 API 学习项目，采用 Node.js + TypeScript + Express + Prisma + PostgreSQL 技术栈。

---

## 🚀 构建与运行命令

| 命令 | 用途 | 说明 |
|------|------|------|
| `npm run dev` | 开发模式（热重载） | 使用 ts-node-dev，自动重启服务 |
| `npm run build` | 编译 TypeScript | 输出到 `dist/` 目录 |
| `npm start` | 生产运行 | 需先执行 `npm run build` |

**注意**：本项目没有配置测试框架（Jest/Vitest）和 Lint 工具（ESLint/Prettier），保持简单专注学习核心概念。

---

## 📁 项目架构

### 三层架构（Controller-Service-Repository）

```
HTTP Request → Routes → Middleware → Controller → Service → Repository → Database
                                              ↓
HTTP Response ← JSON ← Controller ← Service ←
```

| 层级 | 职责 | 文件位置 |
|------|------|----------|
| **Controller** | 处理 HTTP 请求/响应，薄层，无业务逻辑 | `src/controllers/*.controller.ts` |
| **Service** | 核心业务逻辑、规则验证、异常抛出 | `src/services/*.service.ts` |
| **Repository** | 纯数据库访问，无业务逻辑 | `src/repositories/*.repository.ts` |

---

## 📝 代码风格规范

### 文件命名
- 控制器：`{name}.controller.ts`（如 `product.controller.ts`）
- 服务层：`{name}.service.ts`
- 数据层：`{name}.repository.ts`
- 路由：`{name}.routes.ts`
- 中间件：`{name}.middleware.ts`
- 类型定义：`{name}.schemas.ts`（Zod schemas）

### 导入排序（建议）
1. Node.js 内置模块（`path`, `fs` 等）
2. 第三方库（`express`, `zod` 等）
3. 项目内部模块（`../utils/`, `../types/` 等）

### 命名约定
- **变量/函数**：camelCase（如 `getProductById`）
- **类名**：PascalCase（如 `AppError`）
- **类型/接口**：PascalCase（如 `CreateProductDto`）
- **常量**：全大写 + 下划线（如 `JWT_SECRET`）
- **文件名**：camelCase（与模块导出保持一致）

### 类型定义
- 使用 Zod 定义请求参数校验 Schema
- 用 `z.infer` 推导 TypeScript 类型：
  ```typescript
  export type CreateProductDto = z.infer<typeof createProductSchema>;
  ```

---

## 🎯 模式约定

### Controller 模式
```typescript
export const xxxController = {
    async getXxx(req: Request, res: Response, next: NextFunction) {
        try {
            const result = await xxxService.getXxx(...);
            res.json({ success: true, data: result });
        } catch (err) {
            next(err);  // 统一交给错误处理中间件
        }
    }
};
```

### Service 模式
```typescript
export const xxxService = {
    async getXxx(id: number) {
        const item = await xxxRepository.findById(id);
        if (!item) {
            throw new AppError('描述信息', 404, 'ERROR_CODE');
        }
        return item;
    }
};
```

### Repository 模式
```typescript
export const xxxRepository = {
    findById(id: number) {
        return prisma.xxx.findUnique({ where: { id } });
    },
    create(data: CreateDto) {
        return prisma.xxx.create({ data });
    }
};
```

---

## ⚠️ 错误处理

### 统一使用 AppError
```typescript
import { AppError } from '../utils/AppError';

throw new AppError('商品不存在', 404, 'PRODUCT_NOT_FOUND');
```

### 参数说明
- `message`: 给用户的友好错误信息
- `statusCode`: HTTP 状态码
- `code`: 错误码（可选，用于前端识别）

### Controller 中必须捕获异常
所有 async 操作必须使用 `try/catch`，并通过 `next(err)` 交给全局错误处理中间件。

---

## 📋 其他规范

### 环境变量
- 使用 `.env` 文件管理配置
- 通过 `src/utils/env.ts` 封装访问（类型安全）

### 数据库
- Schema 定义在 `prisma/schema.prisma`
- 迁移命令：`npx prisma migrate dev`
- 生成 Client：`npx prisma generate`

### API 响应格式
```json
{
  "success": true,
  "data": { ... }
}
```

或错误时：
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "错误描述"
  }
}
```

---

## 🎓 项目背景（来自 Cursor Rules）

- **学习者背景**：中级 Android 原生 + 初级 iOS 原生 + RN 开发经验
- **项目目标**：后端入门学习，最终打造完整应用
- **AI 角色**：健谈的资深全栈工程师导师
- **特殊要求**：
  1. 详实讲解原理，确保理解
  2. **发现代码错误时指导用户修改，不直接代劳**
  3. 修复文档错误
  4. 更新 `docs/knowledge-gaps.md` 学习进度
  5. 补充重要知识到 `docs/` 附录文件

---

## 📚 参考文档

| 文档 | 位置 |
|------|------|
| 项目总览 | `docs/README.md` |
| 知识进度 | `docs/knowledge-gaps.md` |
| 各阶段指南 | `docs/phase1-scaffold.md` ~ `phase7-polish.md` |
| 附录文档 | `docs/appendix-*.md` |

---

*本规范适用于所有在该仓库工作的 Agentic 编码助手。*
