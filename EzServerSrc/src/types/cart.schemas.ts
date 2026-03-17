import { z } from 'zod';

export const addToCartSchema = z.object({
    productId: z.number().int().positive(),
    quantity: z.number().int().min(1, '商品数量至少为1').default(1)
});

export const updateCartItemSchema = z.object({
    quantity: z.number().int().min(0, '数量不能为负数')
});

export type AddToCartDto = z.infer<typeof addToCartSchema>;
export type UpdateCartItemDto = z.infer<typeof updateCartItemSchema>;