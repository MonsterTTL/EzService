import { z } from 'zod';

//创建商品的schema
export const createProductSchema = z.object({
    name: z.coerce.string().min(1, '商品名不能为空').max(100, '商品名最多100'),
    description: z.coerce.string().min(1, '请填写商品描述'),
    price: z.coerce.number().positive('商品价格必须大于0'),
    stock: z.coerce.number().int('库存必须是整数').min(0, '库存不能为负数'),
    categoryId: z.coerce.number().int().positive()
});

//更新
export const updateProductSchema = createProductSchema.partial();

//查找
export const productQuerySchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
    categoryId: z.coerce.number().int().positive().optional(),
    keyword: z.string().optional(),
    minPrice: z.coerce.number().min(0).optional(),
    maxPrice: z.coerce.number().min(0).optional(),
})

export type CreateProductDto = z.infer<typeof createProductSchema>;
export type UpdateProductDto = z.infer<typeof updateProductSchema>;
export type ProductQuery = z.infer<typeof productQuerySchema>;