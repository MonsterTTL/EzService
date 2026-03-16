import prisma from '../prisma';
import { CreateProductDto, ProductQuery, UpdateProductDto } from '../types/product.schemas';

export const productRepository = {
    async findMany(query: ProductQuery) {
        const { page, pageSize, categoryId, keyword, minPrice, maxPrice} = query;

        //动态构建 where 条件
        const where: any = {};
        if (categoryId) where.categoryId = categoryId;
        if (keyword) where.name = { contains: keyword, mode: 'insensitive' };

        if (minPrice !== undefined) where.price = {
            ...where.price,
            gte: minPrice
        };

        if (maxPrice !== undefined) where.price = { 
            ...where.price, 
            lte: maxPrice 
        };

        const [total, items] = await prisma.$transaction([
            prisma.product.count({ where }),
            prisma.product.findMany({
                where,
                include: {
                    category: {
                        select: {id: true, name: true}
                    }
                },
                skip: (page - 1) * pageSize,
                take: pageSize,
                orderBy: { createdAt: 'desc'}
            }),
        ]);

        return {total, items, page, pageSize};
    },
    findById(id: number) {
        return prisma.product.findUnique({
          where: { id },
          include: { category: { select: { id: true, name: true } } },
        });
    },
    create(data: CreateProductDto & { imageUrls: string[] }) {
        return prisma.product.create({ data });
    },
    update(id: number, data: Partial<UpdateProductDto>) {
        return prisma.product.update({ where: { id }, data });
    },
    delete(id: number) {
        return prisma.product.delete({ where: { id } });
    },
}