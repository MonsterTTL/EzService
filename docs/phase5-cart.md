# Phase 5 - 购物车模块

## 学习目标

完成本阶段后，你将理解：
- 购物车数据结构的设计决策（每个用户一个购物车，购物车里有多个 CartItem）
- 什么是数据库事务（Transaction），什么时候必须用事务
- 并发操作下的库存超卖问题（了解即可，Phase 6 深入）
- Prisma 中如何使用事务
- "Upsert"操作：不存在则插入，存在则更新

---

## 背景知识：数据库事务

**事务（Transaction）** 是数据库的一个核心概念，它保证一组操作要么**全部成功**，要么**全部失败**。

**经典例子：银行转账**

```
A 转 100 元给 B：
1. A 账户减少 100 元
2. B 账户增加 100 元
```

如果步骤 1 成功了，步骤 2 失败了（网络中断、程序崩溃），A 的钱少了但 B 的钱没增加——钱消失了！

事务的作用是：把步骤 1 和步骤 2 包裹在一起，要么都成功提交（Commit），要么都回滚（Rollback）到操作前的状态。

**事务的 ACID 特性：**

- **A（Atomicity，原子性）**：事务中的操作不可分割，要么全做要么全不做
- **C（Consistency，一致性）**：事务执行前后，数据库处于合法状态
- **I（Isolation，隔离性）**：并发事务之间互不干扰
- **D（Durability，持久性）**：事务提交后，数据永久保存

**购物车里需要事务的场景：**

添加商品到购物车时，需要先查询库存是否充足，再更新 CartItem 数量。如果并发请求同时查询都发现"库存充足"，但实际上库存不足……这就是典型的并发问题。在 Phase 5 我们先感受事务的用法，Phase 6 的下单流程会更深入处理这个问题。

---

## 背景知识：Upsert 操作

购物车的"添加商品"逻辑：
- 如果购物车里**没有**这个商品 → **插入**一条新的 CartItem，quantity = 1
- 如果购物车里**已有**这个商品 → **更新**已有记录，quantity += 1

这种"不存在则插入，存在则更新"的操作叫做 **Upsert**（Update + Insert）。

传统写法需要先查询再判断，然后分支操作，很繁琐。Prisma 提供了 `upsert()` 方法，一行搞定：

```typescript
await prisma.cartItem.upsert({
  where: { cartId_productId: { cartId, productId } }, // 唯一标识
  create: { cartId, productId, quantity: 1 },          // 不存在时创建
  update: { quantity: { increment: 1 } },               // 存在时更新
});
```

---

## 动手步骤

### 步骤 1：设计购物车接口

```
GET    /api/cart           获取当前用户的购物车（含商品详情）
POST   /api/cart/items     添加商品到购物车（或增加数量）
PUT    /api/cart/items/:productId  修改某商品的数量
DELETE /api/cart/items/:productId  从购物车移除某商品
DELETE /api/cart           清空购物车
```

所有接口都需要 `authenticate` 中间件（登录才能操作购物车）。

### 步骤 2：创建 Zod Schema

创建 `src/types/cart.schemas.ts`：

```typescript
import { z } from 'zod';

export const addToCartSchema = z.object({
  productId: z.number().int().positive(),
  quantity: z.number().int().min(1, '数量至少为 1').default(1),
});

export const updateCartItemSchema = z.object({
  quantity: z.number().int().min(0, '数量不能为负数'),
  // 数量为 0 时表示删除该商品（也可以单独做，看业务需求）
});

export type AddToCartDto = z.infer<typeof addToCartSchema>;
export type UpdateCartItemDto = z.infer<typeof updateCartItemSchema>;
```

### 步骤 3：创建购物车 Repository

创建 `src/repositories/cart.repository.ts`：

```typescript
import prisma from '../prisma';

export const cartRepository = {
  // 获取用户购物车（不存在则创建）
  async getOrCreateCart(userId: number) {
    return prisma.cart.upsert({
      where: { userId },
      create: { userId },
      update: {},  // 已存在时不做任何更新
      include: {
        items: {
          include: {
            product: {
              select: { id: true, name: true, price: true, stock: true, imageUrls: true }
            }
          }
        }
      }
    });
  },

  // 获取购物车里的某一条 item
  findCartItem(cartId: number, productId: number) {
    return prisma.cartItem.findUnique({
      where: { cartId_productId: { cartId, productId } }
    });
  },

  // 添加或增加商品数量（Upsert）
  upsertCartItem(cartId: number, productId: number, quantityToAdd: number) {
    return prisma.cartItem.upsert({
      where: { cartId_productId: { cartId, productId } },
      create: { cartId, productId, quantity: quantityToAdd },
      update: { quantity: { increment: quantityToAdd } },
    });
  },

  // 设置商品数量（用于修改接口）
  setCartItemQuantity(cartId: number, productId: number, quantity: number) {
    return prisma.cartItem.update({
      where: { cartId_productId: { cartId, productId } },
      data: { quantity },
    });
  },

  // 移除购物车中的某个商品
  removeCartItem(cartId: number, productId: number) {
    return prisma.cartItem.delete({
      where: { cartId_productId: { cartId, productId } },
    });
  },

  // 清空购物车
  clearCart(cartId: number) {
    return prisma.cartItem.deleteMany({
      where: { cartId },
    });
  },
};
```

### 步骤 4：创建购物车 Service

创建 `src/services/cart.service.ts`：

```typescript
import prisma from '../prisma';
import { cartRepository } from '../repositories/cart.repository';
import { AppError } from '../utils/AppError';
import { AddToCartDto, UpdateCartItemDto } from '../types/cart.schemas';

export const cartService = {
  async getCart(userId: number) {
    const cart = await cartRepository.getOrCreateCart(userId);
    
    // 计算购物车总价
    const totalAmount = cart.items.reduce((sum, item) => {
      return sum + Number(item.product.price) * item.quantity;
    }, 0);

    return { ...cart, totalAmount };
  },

  async addToCart(userId: number, dto: AddToCartDto) {
    // 使用 Prisma 事务：查库存 + 更新购物车必须是原子操作
    return prisma.$transaction(async (tx) => {
      // 查商品是否存在且库存充足
      const product = await tx.product.findUnique({
        where: { id: dto.productId }
      });

      if (!product) {
        throw new AppError('商品不存在', 404, 'PRODUCT_NOT_FOUND');
      }
      if (product.stock < dto.quantity) {
        throw new AppError(`库存不足，当前库存：${product.stock}`, 400, 'INSUFFICIENT_STOCK');
      }

      // 获取或创建购物车
      const cart = await tx.cart.upsert({
        where: { userId },
        create: { userId },
        update: {},
      });

      // 检查添加后的总数量是否超过库存
      const existingItem = await tx.cartItem.findUnique({
        where: { cartId_productId: { cartId: cart.id, productId: dto.productId } }
      });
      const newQuantity = (existingItem?.quantity ?? 0) + dto.quantity;
      if (newQuantity > product.stock) {
        throw new AppError(`购物车中已有 ${existingItem?.quantity ?? 0} 件，库存仅剩 ${product.stock} 件`, 400, 'INSUFFICIENT_STOCK');
      }

      // Upsert 购物车条目
      return tx.cartItem.upsert({
        where: { cartId_productId: { cartId: cart.id, productId: dto.productId } },
        create: { cartId: cart.id, productId: dto.productId, quantity: dto.quantity },
        update: { quantity: { increment: dto.quantity } },
        include: { product: { select: { id: true, name: true, price: true } } }
      });
    });
  },

  async updateCartItem(userId: number, productId: number, dto: UpdateCartItemDto) {
    const cart = await cartRepository.getOrCreateCart(userId);
    const item = await cartRepository.findCartItem(cart.id, productId);
    
    if (!item) {
      throw new AppError('购物车中没有该商品', 404, 'ITEM_NOT_FOUND');
    }

    // 数量为 0 时删除该条目
    if (dto.quantity === 0) {
      await cartRepository.removeCartItem(cart.id, productId);
      return null;
    }

    return cartRepository.setCartItemQuantity(cart.id, productId, dto.quantity);
  },

  async removeFromCart(userId: number, productId: number) {
    const cart = await cartRepository.getOrCreateCart(userId);
    const item = await cartRepository.findCartItem(cart.id, productId);
    
    if (!item) {
      throw new AppError('购物车中没有该商品', 404, 'ITEM_NOT_FOUND');
    }

    await cartRepository.removeCartItem(cart.id, productId);
  },

  async clearCart(userId: number) {
    const cart = await cartRepository.getOrCreateCart(userId);
    await cartRepository.clearCart(cart.id);
  },
};
```

### 步骤 5：创建购物车 Controller 和 Router

创建 `src/controllers/cart.controller.ts`：

```typescript
import { Request, Response, NextFunction } from 'express';
import { cartService } from '../services/cart.service';

export const cartController = {
  async getCart(req: Request, res: Response, next: NextFunction) {
    try {
      const cart = await cartService.getCart(req.user!.userId);
      res.json({ success: true, data: cart });
    } catch (error) { next(error); }
  },

  async addToCart(req: Request, res: Response, next: NextFunction) {
    try {
      const item = await cartService.addToCart(req.user!.userId, req.body);
      res.status(201).json({ success: true, data: item });
    } catch (error) { next(error); }
  },

  async updateCartItem(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await cartService.updateCartItem(
        req.user!.userId,
        parseInt(req.params.productId),
        req.body
      );
      res.json({ success: true, data: result });
    } catch (error) { next(error); }
  },

  async removeFromCart(req: Request, res: Response, next: NextFunction) {
    try {
      await cartService.removeFromCart(req.user!.userId, parseInt(req.params.productId));
      res.json({ success: true, data: null });
    } catch (error) { next(error); }
  },

  async clearCart(req: Request, res: Response, next: NextFunction) {
    try {
      await cartService.clearCart(req.user!.userId);
      res.json({ success: true, data: null });
    } catch (error) { next(error); }
  },
};
```

创建 `src/routes/cart.routes.ts`：

```typescript
import { Router } from 'express';
import { cartController } from '../controllers/cart.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import { addToCartSchema, updateCartItemSchema } from '../types/cart.schemas';

const router = Router();

// 所有购物车接口都需要登录
router.use(authenticate);

router.get('/', cartController.getCart);
router.post('/items', validate(addToCartSchema), cartController.addToCart);
router.put('/items/:productId', validate(updateCartItemSchema), cartController.updateCartItem);
router.delete('/items/:productId', cartController.removeFromCart);
router.delete('/', cartController.clearCart);

export default router;
```

在 `app.ts` 中注册：
```typescript
app.use('/api/cart', cartRoutes);
```

---

## 用 Postman 测试

### 添加商品到购物车
```
POST http://localhost:3000/api/cart/items
Authorization: Bearer <user_token>
Content-Type: application/json

{ "productId": 1, "quantity": 2 }
```

### 查看购物车
```
GET http://localhost:3000/api/cart
Authorization: Bearer <user_token>
```

期望响应包含商品详情和总价：
```json
{
  "success": true,
  "data": {
    "id": 1,
    "userId": 1,
    "items": [
      {
        "productId": 1,
        "quantity": 2,
        "product": { "name": "iPhone 15", "price": "8999.00" }
      }
    ],
    "totalAmount": 17998
  }
}
```

### 测试库存不足
尝试添加一个库存为 0 的商品，应该返回 400 错误。

---

## 思考题（不强制实现，但建议思考）

**问题：超卖漏洞**

我们的事务只防止了单次添加超卖。但考虑这个场景：

- 库存剩 1 件
- 用户 A 和用户 B 同时打开商品页，都看到"有货"
- A 的购物车已有 1 件（刚好等于库存）
- B 同时也添加 1 件到购物车

在我们当前的实现里，B 添加时会检查"添加后总数 > 库存吗"，但 B 的购物车里是 0，所以检查通过了。结果两个人的购物车都有 1 件，但库存只有 1 件——真正下单时才会出问题。

这就是为什么**库存扣减必须在下单时做，而不是加购物车时**。Phase 6 会解决这个问题。

---

## 完成标志

- [X] 添加商品到购物车正常工作
- [X] 查看购物车能显示商品详情和总价
- [X] 修改数量为 0 时自动删除该条目
- [X] 添加数量超过库存时返回 400 错误
- [X] 能理解 `prisma.$transaction()` 的用法和作用

完成后，进入 [Phase 6 - 订单模块](./phase6-order.md)。
