import prisma from '../prisma';
import { OrderStatus } from '@prisma/client';

const ORDER_INCLUDE = {
    item: {
        include: {
            product: { select: { id: true, name: true, imageUrls: true} }
        }
    }
} as const;

export const orderRepository = {
    //查找一个用户的所有订单
    findByUserId(userId: number) {
        return prisma.order.findMany({
            where: { userId },
            include: ORDER_INCLUDE,
            orderBy: { createdAt: 'desc' }
        });
    },
    //按照订单ID查找
    findById(id: number) {
        return prisma.order.findUnique({
            where: {id},
            include: ORDER_INCLUDE
        });
    },
    //更新订单状态
    updateStatus(id: number, status: OrderStatus) {
        return prisma.order.update({
            where: {id},
            data: {status}
        });
    }
}

