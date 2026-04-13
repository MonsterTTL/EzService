---
version: 1.2.1
contentHash: 8d9bf185
ruleType: Manual
---

## Code Review 高频问题

以下是 CodeReview 中最常出现的问题，**修改代码后请优先逐条自查**。

- [ ] 重复代码？提取为函数或常量
- [ ] 函数入参超过 4 个？用 key-value 对象传参
- [ ] 多处实现相同逻辑（违反 DRY）？抽取到公共层统一注入
- [ ] 函数/变量职责已变化？命名应同步更新
- [ ] 有 `any` 类型？用精确类型替代，禁止 `as any`
- [ ] 魔法数字/硬编码映射？提取为常量


修改文件前，先检查当前文件是否遵循代码风格的要求，主动优化代码以遵循代码风格

# 组件、模块、函数设计原则

- 创建精简而专注的组件，组件只负责专一的功能，每个组件不超过 200 行代码
- 创建遵循纯函数设计原则的函数，即相同输入产生相同输出并且无副作用
- 避免函数入参过多：入参数量不要超过4个，可通过 "key-value 对象字面量" 方式传参减少入参
- 偏好使用函数式编程，而不是类型编程，框架约定的除外

## 全链路修改意识

修改一个函数时，必须同步考虑**所有调用方和关联代码**，避免遗漏导致运行时错误。

- 修改函数签名（参数、返回值）时，搜索所有调用点一并更新
- 添加新字段到接口/类型时，检查数据构造处是否也已补充
- 修改公共 API 时，检查文档是否需要同步更新

## 统一使用项目已有工具

优先使用项目已有的工具函数，避免用原生 API 拼凑出等价实现。

- 使用项目已有的工具函数替代原生 API 的变体，保持行为一致性和可维护性

## 文件代码组织顺序

在模块文件中，代码应按以下顺序组织，便于维护者快速了解文件的主要脉络：

1. **导入语句** - 所有 import 语句放在文件顶部
2. **公开类型定义** - 导出的 interface、type、enum 等（供外部使用）
3. **常量定义** - 导出的常量
4. **主要公开函数/类** - 核心功能的导出函数或类（文件的主要职责）
5. **次要公开函数** - 辅助性的导出工具函数
6. **内部类型定义** - 不导出的 interface、type（仅内部使用）
7. **内部函数** - 不导出的辅助函数、工具函数


# 代码健壮性

## 前置校验（Fail Fast）

函数/流程开始时，先校验**必要输入**是否满足，不满足立即抛错终止，避免带着无效数据继续执行。

- 区分"必要参数"和"可选参数"：只有必要参数缺失时才抛错
- 输入校验应该放在流程最前面（前置条件），而不是嵌套在业务逻辑内部

## 安全的类型转换与数据解析

不信任外部输入和运行时数据，对转换和解析操作做好防护。

- 使用 `JSON.parse` 时必须 `try-catch`，精确控制错误处理流程
- 类型转换必须设置默认值：`Number(a) || 0`、`String(a ?? '')`，防止出现 `NaN`、`undefined` 等意外结果
- 避免 Promise 永远 pending：所有分支条件都应该能走到 `resolve` 或 `reject`

# 错误处理

- 网络请求和接口异常处理函数一般封装在 api 目录下，优先使用已经封装好的请求函数调用业务接口​存量项目
- 异步任务失败时，使用UI组件库里的 message 组件实现友好的错误提示 UI


# 常量管理


- 常量在constants目录下统一维护
- 需要抽取常量的：需要在项目中保持一致、具有特殊业务语义的字符串枚举值和数字，避免魔法数字（magic number，意义不明的数字）
- 不需要变成常量的：
  - UI 上的文本、用户提示文案
  - 样式相关的值（如颜色、尺寸、间距等），应在样式文件中定义

<example>

```ts
// constants/index.ts
// 用户角色常量
export const USER_ROLES = {
  ADMIN: 'admin',
  USER: 'user',
  GUEST: 'guest',
}
// 订单状态常量
export const ORDER_STATUS = { PROCESSING: '1', SUCCESS: '2', FAILURE: '3' }
// user-components.ts
import { USER_ROLES, ORDER_STATUS } from '../constants'
// 使用角色常量
const admins = data.filter(user => user.role === USER_ROLES.ADMIN)
// 使用订单状态常量
const successOrders = data.filter(order => order.status === ORDER_STATUS.SUCCESS)
```

</example>

# 保持代码简洁和可读性

## 使用可选链简化表达式

原则：当业务逻辑不需要区分 `undefined` 和 `0` 等值时，使用 `??` 操作符可以让代码更简洁

```ts
// ✅ 推荐：仅检查对象存在性
if (data?.user?.name) {
  console.log(data.user.name)
}

// ❌ 不推荐：过度显式
if (
  data !== undefined &&
  data !== null &&
  data.user !== undefined &&
  data.user !== null &&
  data.user.name
) {
  console.log(data.user.name)
}

// ✅ 推荐：使用可选链调用方法
obj?.method?.()

// ❌ 不推荐：显式检查
if (obj && obj.method) {
  obj.method()
}
```

## 使用对象展开运算符简化数据映射

当需要将数据库查询结果映射为返回格式时，优先使用对象展开运算符，只处理需要转换的字段。

❌ 不推荐：逐个字段映射

```typescript
// 冗余的逐个字段映射
const list = records.map(record => ({
  id: record.id,
  taskId: record.taskId,
  issueId: record.issueId,
  adoptionStatus: record.adoptionStatus,
  category: record.category,
  createdAt: record.addTime, // 需要转换
  updatedAt: record.updateTime, // 需要转换
}))
```

✅ 推荐：使用展开运算符，只处理需要转换的字段

```typescript
// 简洁的字段映射，只处理需要转换的字段
const list = records.map(record => {
  const { addTime, updateTime, ...rest } = record
  return {
    ...rest,
    createdAt: addTime,
    updatedAt: updateTime,
  }
})
```

## 使用解构赋值保持代码整洁

使用解构赋值简化代码，避免重复访问对象属性，提高代码可读性和可维护性。这是一个**通用的代码整洁要求**，不仅适用于常量，也适用于函数参数、API 响应、组件 props 等任何对象访问场景。

```ts
// ❌ 不推荐：重复访问对象属性
export const buildFormData = (orgId: string) => {
  return new URLSearchParams({
    orderColumnIndex: String(FEDO_PR_CONFIG.ORDER_COLUMN_INDEX),
    searchConfigV2: JSON.stringify(FEDO_PR_CONFIG.SEARCH_CONFIG),
    length: String(FEDO_PR_CONFIG.PAGE_SIZE),
    path: FEDO_PR_CONFIG.DASHBOARD_PATH,
    widgetId: FEDO_PR_CONFIG.WIDGET_ID,
  })
}

// ✅ 推荐：使用解构赋值简化访问
export const buildFormData = (orgId: string) => {
  const { ORDER_COLUMN_INDEX, SEARCH_CONFIG, PAGE_SIZE, DASHBOARD_PATH, WIDGET_ID } = FEDO_PR_CONFIG

  return new URLSearchParams({
    orderColumnIndex: String(ORDER_COLUMN_INDEX),
    searchConfigV2: JSON.stringify(SEARCH_CONFIG),
    length: String(PAGE_SIZE),
    path: DASHBOARD_PATH,
    widgetId: WIDGET_ID,
  })
}
```

# 注释规范

## 一般原则

- **避免冗余注释**：不要添加描述显而易见内容的注释，代码本身应该是自解释的。在代码修改时，只写 "有价值的注释"
- **有价值的注释**：
  - 解释复杂的业务逻辑或算法
  - 说明特殊的浏览器兼容性处理
  - 标注临时方案或待优化的代码（配合 TODO/FIXME）
  - 解释不直观的设计决策

## JSDoc 注释简明写法

对于 TypeScript 项目，避免冗长的 JSDoc 参数注释，采用以下推荐方案：

### 场景一：利用类型推导（基础场景）

当参数类型明确、名称自解释时，直接省略参数注释：

```typescript
// ✅ 推荐：只注释函数整体功能
/**
 * 记录 JSON 格式的结果到文件
 */
export function recordResultJson(params): void
```

### 场景二：内联类型注释（复杂对象）

对于字段需要解释的参数，直接标注在类型定义处：

```typescript
// ✅ 推荐：字段级注释
export function recordResult(params: {
  /** 主任务ID，通常是 UUID */
  mainTaskId: string
  /** 子任务ID，从 filename 去掉扩展名 */
  subTaskId: string
  /** 模型输出和解析结果 */
  llmTextOutput?: {
    modelOutput: string
    parsedJson: unknown
  }
  jsonData?: unknown
  textData?: string
}): void
```

### 场景三：提取公共类型定义（高复用场景）

对于复用的复杂参数对象，提取为独立的 interface/type：

```typescript
/**
 * 基础任务参数
 */
interface RecordTaskParams {
  /** 主任务ID，通常是 UUID */
  mainTaskId: string
  /** 子任务ID，从 filename 去掉扩展名 */
  subTaskId: string
}
```

# 禁止硬编码业务数据

- **严禁**在代码中直接写入任何模拟数据（mock data），包括但不限于：示例用户信息、测试数据数组、假的API响应数据、占位符数据，优先使用真实的数据源，只有当用户明确要求添加mock数据用于演示或测试时，才可以添加

# 样式管理

- 颜色、字体等通用样式应使用变量定义在全局样式文件中


# TypeScript类型编程规范

- 使用精确的类型定义，避免使用 any 类型
- 避免使用 ts-ignore，所有 TypeScript 类型错误必须通过正确定义类型或修正代码逻辑解决
- 不使用 enum，用 type 表示枚举

## 类型定义满足自解释性

比如使用 `Map` 时，应通过类型别名赋予 key 明确的语义，提高代码可读性。

```ts
// ✅ 推荐：使用语义化的类型别名
type MessageType = string

private services = new Map<MessageType, BridgeMessageHandler<unknown, unknown>>()
```

```ts
// ❌ 不推荐：直接使用 string，无法表达 key 的业务含义
private services = new Map<string, BridgeMessageHandler<unknown, unknown>>()
```

## 类型一致性与布尔值判断

- **确保布尔变量的类型一致性**：布尔类型的变量必须始终返回 `boolean` 类型（`true` 或 `false`），不能返回 `undefined`、`null` 或其他 truthy/falsy 值
- **可选链与空值合并**：对可选属性进行方法调用时，使用可选链 `?.` 配合空值合并运算符 `??` 确保返回明确的布尔值
- **避免隐式类型转换**：不要依赖 `&&` 运算符的短路特性来进行布尔判断，因为它可能返回非布尔值

```ts
// ❌ 不推荐：isValid 可能是 undefined，不是 boolean 类型
const isValid = data.name && data.name.includes('test')
// 当 data.name 为 undefined 时，isValid 的值是 undefined，而不是 false

// ✅ 推荐：使用可选链和空值合并，确保返回 boolean
const isValid = data.name?.includes('test') ?? false
```

## 类型定义规范

- **API 相关类型**：后端接口的请求参数、响应数据等类型定义应直接在对应的 api 模块文件中定义并导出，保持类型与接口调用的就近原则
- **业务领域类型**：避免类型定义重复，应该在 `types` 目录中定义通用的数据结构类型
- **类型字段注释**：为 interface 和 type 的字段添加注释，说明字段的用途、格式要求、取值范围等关键信息，提升代码可读性和可维护性
- **类型命名描述数据概念**：interface/type 的命名应描述它代表的数据概念，不要绑定具体操作。被多个函数/模块共享的类型尤其如此

```ts
// ❌ 不推荐：重复定义相同的类型
async function getAdoptionStatus(): Promise<
  Map<string, { rate: number; totalCount: number; adoptedCount: number; hasFeedback: boolean }>
> {
  // ...
}

const result = await getAdoptionStatus()
const data: { rate: number; totalCount: number; adoptedCount: number; hasFeedback: boolean } =
  result // ❌ 类型重复定义了

// ✅ 推荐：API 类型定义在 api 文件中，并添加字段注释
// src/api/user.ts
export interface GetUserListParams {
  /** 页码，从 1 开始 */
  page: number
  /** 每页数量 */
  pageSize: number
  /** 搜索关键词 */
  keyword?: string
}

export interface GetUserListResponse {
  success: boolean
  data: {
    /** 总记录数 */
    total: number
    /** 用户列表 */
    list: UserInfo[]
  }
}

// ✅ 推荐：业务领域类型在 types 目录
// src/types/user.ts

export type UserRole = 'admin' | 'user' | 'guest'
```

## 类型导入规范

- **仅导入类型**：使用 `import type { } from xxx`
- **既有类型也有值（函数、常量等）**：使用 `import { } from xxx`，不要在单个导入项前加 `type` 关键字

```ts
// ✅ 推荐：仅导入类型时使用 import type
import type { DateRange, UserRole } from '@/types'

// ✅ 推荐：既有类型也有函数时，统一使用 import
import { getUserList, GetUserListParams, UserInfo } from '@/api/user'

// ❌ 不推荐：混用 type 关键字
import { getUserList, type GetUserListParams, type UserInfo } from '@/api/user'
```

## 类型导出规范

- **类型单一出处原则**：类型只在源头定义处导出，如无特殊约定中间层不应透传 export。其他文件只导入使用，不再导出，避免多个导出源

```ts
// ❌ 不推荐：中间层透传导出，造成多个导出源
// src/webviews/pages/workbench/types/codeReview.ts
import type { FileStatus, CommittedType } from '@/services/code-review'
export type { FileStatus, CommittedType } // 不要这样做
```

### 模块入口 index.ts 的导出方法

模块的 `index.ts` 用于统一导出子模块，应使用 `export * from` 简化写法，避免冗余的命名导出。仅在需要重新导出特定项时使用显式导出，例如需要改变导出名称或选择性导出。

```ts
// ✅ 推荐：使用 export * from 简化
export * from './generator'
export * from './config'

// ❌ 不推荐：显式列出每个导出项
export { generateRules, generateRulesForRepo } from './generator'
export { CODEBASE_RULE_CONFIGS } from './config'
export type { CodebaseRuleConfig } from './config'
```

## 联合类型最佳实践

- **避免混入 `string` 类型**：不要在字面量联合类型中混入 `string`，这会导致类型退化为普通 `string`，失去对合法值的约束能力
- **明确列出所有支持的值**：根据业务需求，明确列出所有支持的字面量值

```ts
// ❌ 不推荐：包含 string 使联合类型失效
export type EventType = 'active' | 'rules' | string
// 此时 EventType 实际上等同于 string，无法约束只能是 'active' 或 'rules'

// ✅ 推荐：只列出具体的字面量值
export type EventType = 'active' | 'rules'

// ✅ 推荐：如果确实需要支持任意字符串，直接使用 string
export type EventType = string

// ✅ 推荐：如果需要扩展支持更多类型，明确列出所有值
export type EventType = 'active' | 'rules' | 'custom' | 'other'
```


<style_guide>

- 使用 scss 维护样式，避免内联样式
- 避免不必要的选择器嵌套，推荐使用 BEM 风格的 class 命名方法

比如 `.container .body .meta` 中，如果 `.container` 中仅有一种 `.meta` ，则完全可以参略 `.body`，在一个命名空间下，只要确保不冲突，保持2层样式嵌套就好

## SCSS 模块化组织规范

**强制要求**：使用 `&` 符号组织 BEM 类名，通过继承类名前缀的方式，将相关样式模块化编写，使代码结构更清晰、更易维护。

### 核心理念

使用 `&` 符号**不是为了增加选择器嵌套**，而是为了：

1. **模块化编写**：相关的类名写在一起，便于查找和维护
2. **继承类名前缀**：通过 `&__element` 和 `&--modifier` 自动拼接类名
3. **保持扁平化**：编译后仍然是扁平的 BEM 类名，不增加选择器特异性

### 基本原则

1. **使用 `&` 拼接类名**：`&__element` 编译为 `.block__element`，保持扁平
2. **逻辑分组**：相关的样式规则写在同一个代码块中
3. **适度组织**：根据可读性需要，决定是否将子元素提取为独立块

<example>

```scss
// ✅ 推荐：使用 & 符号模块化组织
.user-rule-page {
  background: transparent;
  min-height: 100vh;

  // 头部区域 - 编译为 .user-rule-page__header
  &__header {
    margin-bottom: 20px;
    display: flex;

    // 编译为 .user-rule-page__header-actions（仍然是扁平的）
    &-actions {
      flex-shrink: 0;
      min-width: 660px;
    }
  }

  // 内容区域 - 编译为 .user-rule-page__content
  &__content {
    padding: 20px;

    // 编译为 .user-rule-page__content-title
    &-title {
      font-size: 16px;
      font-weight: 600;
    }
  }
}

// ✅ 推荐：子元素较多时，可以提取为独立块
.ai-coding-review__summary {
  padding: 12px 16px;

  &-label {
    font-size: 14px;
  }

  &-value {
    font-weight: 600;
  }
}

// ✅ 推荐：状态、伪类使用 & 嵌套
.button {
  padding: 8px 16px;

  &:hover {
    background: #f5f5f5;
  }

  &--primary {
    background: #1890ff;
  }

  &:disabled {
    opacity: 0.5;
  }
}

// ❌ 不推荐：分散编写，难以维护
.user-rule-page {
  background: transparent;
}
.user-rule-page__header {
  margin-bottom: 20px;
}
.user-rule-page__header-actions {
  flex-shrink: 0;
}
```

</example>

### 编写建议

- **模块化组织**：相关的类名写在一起，使用 `&` 继承前缀
- **保持可读性**：当一个块的子元素过多时，可以拆分为多个独立的样式块
- **避免真正的嵌套**：不要写 `.parent { .child { } }`，这会增加选择器特异性

</style_guide>
