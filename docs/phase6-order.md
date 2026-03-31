# Phase 6 - 订单模块（核心业务）

## 学习目标

完成本阶段后，你将理解：
- 为什么"下单"必须在一个事务中完成多个操作
- 价格快照（Price Snapshot）的必要性
- 库存扣减的正确时机（下单时，不是加购时）
- 什么是订单状态机（State Machine），如何防止非法的状态跳转
- 乐观锁（Optimistic Lock）的概念，防止超卖的更健壮方案

---

## 背景知识：为什么下单需要事务？

下单这个操作在业务上需要同时完成以下几件事：

```
1. 验证购物车不为空
2. 验证每件商品库存充足
3. 创建 Order 记录
4. 创建 OrderItem 记录（含价格快照）
5. 扣减每件商品的库存
6. 清空购物车
```

这 6 步必须是**原子的**。设想以下故障场景：

- 步骤 3-4 成功了，步骤 5 数据库崩溃了 → 订单创建了但库存没扣，会超卖
- 步骤 5 部分成功（商品 A 扣了，商品 B 失败）→ 数据不一致

**用事务包裹所有操作，任何一步失败，所有操作全部回滚。**

---

## 背景知识：防超卖的数据库技巧

假设库存剩 1 件，用户 A 和用户 B 同时下单：

```
时间线：
T1: A 查询库存 → 剩 1 件，检查通过
T1: B 查询库询库存 → 剩 1 件，检查通过（同时发生！）
T2: A 扣库存：stock = 1 - 1 = 0
T2: B 扣库存：stock = 1 - 1 = 0  ← 超卖！
```

**解决方案：带条件的 UPDATE（乐观锁）**

不要先查再更新，而是直接用条件 UPDATE：

```sql
UPDATE products 
SET stock = stock - 1 
WHERE id = ? AND stock >= 1;
```

如果 `stock` 已经是 0，这条 SQL 影响的行数是 0（`affectedRows = 0`），说明库存不足，下单失败。这个技巧让数据库本身来保证原子性，不需要额外的锁。

在 Prisma 里这样写：
```typescript
const updated = await tx.product.updateMany({
  where: { id: productId, stock: { gte: quantity } }, // 条件：库存 >= 要扣减的数量
  data: { stock: { decrement: quantity } },
});

if (updated.count === 0) {
  throw new AppError('库存不足', 400, 'INSUFFICIENT_STOCK');
}
```

---

## 背景知识：订单状态机

订单状态不能随意跳转，必须按照业务规则流转：

```
                ┌──────────────────────────────────────────┐
                │                                          │
PENDING ──── PAID ──── SHIPPED ──── COMPLETED             │
   │                                                        │
   └──────────────────── CANCELLED ────────────────────────┘
（只有 PENDING/PAID 状态可以取消）
```

合法的状态转换：
- `PENDING` → `PAID`（用户付款）
- `PENDING` → `CANCELLED`（用户取消）
- `PAID` → `SHIPPED`（商家发货）
- `PAID` → `CANCELLED`（付款后取消，需要退款）
- `SHIPPED` → `COMPLETED`（确认收货）

非法的转换（必须拒绝）：
- `COMPLETED` → `CANCELLED`（已完成不能取消）
- `SHIPPED` → `PENDING`（不能回退状态）

---

## 动手步骤

### 步骤 1：定义状态转换规则

创建 `src/utils/orderStateMachine.ts`：

```typescript
import { OrderStatus } from '@prisma/client';

// 定义每个状态允许转换到哪些状态
const VALID_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING:   [OrderStatus.PAID, OrderStatus.CANCELLED],
  PAID:      [OrderStatus.SHIPPED, OrderStatus.CANCELLED],
  SHIPPED:   [OrderStatus.COMPLETED],
  COMPLETED: [],   // 终态，不能再变
  CANCELLED: [],   // 终态，不能再变
};

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return VALID_TRANSITIONS[from].includes(to);
}

// 状态的中文说明（用于错误提示）
export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  PENDING:   '待支付',
  PAID:      '已支付',
  SHIPPED:   '已发货',
  COMPLETED: '已完成',
  CANCELLED: '已取消',
};
```

### 步骤 2：创建 Zod Schema

创建 `src/types/order.schemas.ts`：

```typescript
import { z } from 'zod';
import { OrderStatus } from '@prisma/client';

export const createOrderSchema = z.object({
  address: z.string().min(5, '请填写完整的收货地址').max(200),
});

export const updateOrderStatusSchema = z.object({
  status: z.nativeEnum(OrderStatus),
});

export type CreateOrderDto = z.infer<typeof createOrderSchema>;
```

### 步骤 3：创建订单 Repository

创建 `src/repositories/order.repository.ts`：

```typescript
import prisma from '../prisma';
import { OrderStatus } from '@prisma/client';

const ORDER_INCLUDE = {
  items: {
    include: {
      product: { select: { id: true, name: true, imageUrls: true } }
    }
  }
} as const;

export const orderRepository = {
  findByUserId(userId: number) {
    return prisma.order.findMany({
      where: { userId },
      include: ORDER_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
  },

  findById(id: number) {
    return prisma.order.findUnique({
      where: { id },
      include: ORDER_INCLUDE,
    });
  },

  updateStatus(id: number, status: OrderStatus) {
    return prisma.order.update({
      where: { id },
      data: { status },
    });
  },
};
```

### 步骤 4：创建订单 Service（核心）

创建 `src/services/order.service.ts`：

```typescript
import prisma from '../prisma';
import { orderRepository } from '../repositories/order.repository';
import { cartRepository } from '../repositories/cart.repository';
import { AppError } from '../utils/AppError';
import { canTransition, ORDER_STATUS_LABEL } from '../utils/orderStateMachine';
import { CreateOrderDto } from '../types/order.schemas';
import { OrderStatus } from '@prisma/client';

export const orderService = {
  async getMyOrders(userId: number) {
    return orderRepository.findByUserId(userId);
  },

  async getOrderById(id: number, userId: number) {
    const order = await orderRepository.findById(id);
    if (!order) throw new AppError('订单不存在', 404, 'ORDER_NOT_FOUND');
    // 只有本人才能查看自己的订单（管理员可扩展）
    if (order.userId !== userId) throw new AppError('无权查看该订单', 403, 'FORBIDDEN');
    return order;
  },

  // ★ 核心方法：创建订单
  async createOrder(userId: number, dto: CreateOrderDto) {
    return prisma.$transaction(async (tx) => {
      // === 第 1 步：获取购物车 ===
      const cart = await tx.cart.findUnique({
        where: { userId },
        include: { items: true }
      });

      if (!cart || cart.items.length === 0) {
        throw new AppError('购物车为空', 400, 'CART_EMPTY');
      }

      // === 第 2 步：检查库存并扣减（原子操作防超卖）===
      let totalAmount = 0;
      const orderItemsData = [];

      for (const cartItem of cart.items) {
        // 用乐观锁方式扣减库存：只有库存 >= 需求量时才更新
        const updated = await tx.product.updateMany({
          where: {
            id: cartItem.productId,
            stock: { gte: cartItem.quantity }  // 关键：条件里检查库存
          },
          data: { stock: { decrement: cartItem.quantity } },
        });

        if (updated.count === 0) {
          // updateMany 影响行数为 0，说明库存不足
          const product = await tx.product.findUnique({ where: { id: cartItem.productId } });
          throw new AppError(
            `商品「${product?.name}」库存不足（剩余 ${product?.stock} 件）`,
            400,
            'INSUFFICIENT_STOCK'
          );
        }

        // 获取商品当前价格（用于快照）
        const product = await tx.product.findUnique({ where: { id: cartItem.productId } });
        totalAmount += Number(product!.price) * cartItem.quantity;

        orderItemsData.push({
          productId: cartItem.productId,
          quantity: cartItem.quantity,
          priceSnapshot: product!.price,  // ★ 价格快照
        });
      }

      // === 第 3 步：创建订单 ===
      const order = await tx.order.create({
        data: {
          userId,
          address: dto.address,
          totalAmount,
          status: 'PENDING',
          item: { create: orderItemsData }
        },
        include: {
          item: {
            include: {
              product: { select: { id: true, name: true } }
            }
          }
        }
      });

      // === 第 4 步：清空购物车 ===
      await tx.cartItem.deleteMany({ where: { cartId: cart.id } });

      return order;
    });
    // 事务结束：以上所有操作要么全成功，要么全回滚
  },

  // 更新订单状态（含状态机校验）
  async updateOrderStatus(orderId: number, newStatus: OrderStatus, operatorId: number, isAdmin: boolean) {
    const order = await orderRepository.findById(orderId);
    if (!order) throw new AppError('订单不存在', 404, 'ORDER_NOT_FOUND');

    // 非管理员只能操作自己的订单
    if (!isAdmin && order.userId !== operatorId) {
      throw new AppError('无权操作该订单', 403, 'FORBIDDEN');
    }

    // 状态机校验
    if (!canTransition(order.status, newStatus)) {
      throw new AppError(
        `订单状态不能从「${ORDER_STATUS_LABEL[order.status]}」变更为「${ORDER_STATUS_LABEL[newStatus]}」`,
        400,
        'INVALID_STATUS_TRANSITION'
      );
    }

    return orderRepository.updateStatus(orderId, newStatus);
  },
};
```

### 步骤 5：创建订单 Controller 和 Router

创建 `src/controllers/order.controller.ts`：

```typescript
import { Request, Response, NextFunction } from 'express';
import { orderService } from '../services/order.service';
import { OrderStatus } from '@prisma/client';

export const orderController = {
  async getMyOrders(req: Request, res: Response, next: NextFunction) {
    try {
      const orders = await orderService.getMyOrders(req.user!.userId);
      res.json({ success: true, data: orders });
    } catch (error) { next(error); }
  },

  async getOrderById(req: Request, res: Response, next: NextFunction) {
    try {
      const order = await orderService.getOrderById(parseInt(req.params.id), req.user!.userId);
      res.json({ success: true, data: order });
    } catch (error) { next(error); }
  },

  async createOrder(req: Request, res: Response, next: NextFunction) {
    try {
      const order = await orderService.createOrder(req.user!.userId, req.body);
      res.status(201).json({ success: true, data: order });
    } catch (error) { next(error); }
  },

  async updateOrderStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const isAdmin = req.user!.role === 'ADMIN';
      const order = await orderService.updateOrderStatus(
        parseInt(req.params.id),
        req.body.status as OrderStatus,
        req.user!.userId,
        isAdmin
      );
      res.json({ success: true, data: order });
    } catch (error) { next(error); }
  },
};
```

创建 `src/routes/order.routes.ts`：

```typescript
import { Router } from 'express';
import { orderController } from '../controllers/order.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import { createOrderSchema, updateOrderStatusSchema } from '../types/order.schemas';

const router = Router();

router.use(authenticate);

router.get('/', orderController.getMyOrders);
router.get('/:id', orderController.getOrderById);
router.post('/', validate(createOrderSchema), orderController.createOrder);
router.patch('/:id/status', validate(updateOrderStatusSchema), orderController.updateOrderStatus);

export default router;
```

在 `app.ts` 中注册：
```typescript
app.use('/api/orders', orderRoutes);
```

---

## 用 Postman 测试

### 1. 确保购物车里有商品，然后下单
```
POST http://localhost:3000/api/orders
Authorization: Bearer <user_token>
Content-Type: application/json

{ "address": "广东省深圳市南山区科技园 1 号" }
```

期望响应：创建成功的订单，状态为 `PENDING`，包含 `priceSnapshot`。

同时检查：
- 购物车自动清空了
- 商品库存减少了

### 2. 测试超卖防护
把某商品库存改为 1，用两个用户同时下单，看看会发生什么（其中一个应该失败）。

### 3. 状态流转测试
```
PATCH http://localhost:3000/api/orders/1/status
Authorization: Bearer <admin_token>
Content-Type: application/json

{ "status": "PAID" }
```

尝试非法的状态跳转（如 `COMPLETED` → `CANCELLED`），应该返回 400 错误。

### 4. 验证价格快照
下单后，修改商品价格（用 Prisma Studio 直接改），再查询历史订单，`priceSnapshot` 应该还是下单时的价格。

---

## 阶段小结

这个阶段是整个项目的核心，你在这里理解了：

| 概念 | 为什么需要 |
|------|----------|
| 事务（Transaction） | 下单涉及多张表的操作，必须保证原子性 |
| 价格快照 | 商品价格会变动，历史订单必须记录下单时的价格 |
| 乐观锁扣库存 | 防止并发下单导致超卖 |
| 状态机 | 防止订单状态做出非法的转换，保证业务数据一致性 |

---

## 完成标志

- [ ] 下单后：订单创建成功、购物车清空、库存减少（三者同时）
- [ ] 下单失败时（库存不足）：三者都没有变化（事务回滚）
- [ ] 订单包含 `priceSnapshot` 字段
- [ ] 修改商品价格后，历史订单的价格不变
- [ ] 非法状态跳转返回清晰的错误信息

完成后，进入 [Phase 7 - 工程化收尾](./phase7-polish.md)。
