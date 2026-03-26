import { z } from 'zod';
import { OrderStatus } from '@prisma/client';

//验证参数
export const createOrderSchema = z.object({
    address: z.string().min(5, '请填写完整地址').max(200),
});

export const updateOrderSchema = z.object({
    status: z.nativeEnum(OrderStatus),
})

export type CreateOrderDto = z.infer<typeof createOrderSchema>;