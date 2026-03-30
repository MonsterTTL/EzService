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
    //根据订单ID查询订单时考虑隐私
    async getOrderById(id: number, userId: number) {
        const order = await orderRepository.findById(id);
        if (!order) throw new AppError('订单不存在', 404, 'ORDER_NOT_FOUND');
        if (order.userId !== userId) {
            throw new AppError('无权查看该订单', 401, 'FORBIDDEN');
        }
        return order;
    },
    //创建订单
    async createOrder(userId: number, dto: CreateOrderDto) {
        return prisma.$transaction(async(tx) => {
            //step1 获取购物车
            const cart = await tx.cart.findUnique({
                where: {userId},
                include: {items: true}
            });
            if (!cart || cart.items.length === 0) {
                throw new AppError('购物车为空', 400, "EMPTY_CART");
            }
            //step2 减库存
            let amount = 0;
            const orderItemData = [];
            for(const cartItem of cart.items) {
                //更新商品库存
                const updated = await tx.product.updateMany({
                    where: {
                        id: cartItem.productId,
                        //库存要大于等于购物车中的数量
                        stock: { gte: cartItem.quantity }
                    },
                    data: {
                        stock: { decrement: cartItem.quantity }
                    }
                });
                const product = await tx.product.findUnique({ where: { id: cartItem.productId } });
                //说明修改失败了
                if (updated.count === 0) {
                    throw new AppError(
                      `商品「${product?.name}」库存不足（剩余 ${product?.stock} 件）`,
                      400,
                      'INSUFFICIENT_STOCK'
                    );
                }

                //计算商品总结
                amount += Number(product?.price) * cartItem.quantity;
                orderItemData.push({
                    productId: cartItem.productId,
                    quantity: cartItem.quantity,
                    priceSnapshot: product!.price,  // ★ 价格快照
                });
            }

            //step4 创建订单并清空购物车
            const order = await tx.order.create({
                data: {
                    userId,
                    address: dto.address,
                    totalAmount: amount,
                    status: OrderStatus.PENDING,
                    //嵌套新建OrderItems
                    item: { create: orderItemData }
                },
                include: {
                    item: {
                      include: {
                        product: { select: { id: true, name: true } }
                      }
                    }
                }
            });

            await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
            return order;
        });
    },

    //流转订单状态
    




};