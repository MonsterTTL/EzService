import prisma from "../prisma";

export const cartRepository = {

    async getOrCreateCart(userId: number) {
        return prisma.cart.upsert({
            where: { userId },
            create: { userId },
            update: {},
            include: {
                items: {
                    include: {
                        product: {
                            select: {
                                id: true, 
                                name: true, 
                                price: true, 
                                stock: true, 
                                imageUrls: true
                            }
                        }
                    }
                }
            }
        });
    },
    //查找某个购物车的某一条记录
    async getCartItem(cartId: number, productId: number) {
        return prisma.cartItem.findUnique({
            where: { cartId_productId: { cartId, productId } }
        });
    },
    //插入购物车商品
    async upsertCartItem(cartId: number, productId: number, quantityToAdd: number) {
        return prisma.cartItem.upsert({
            where: { cartId_productId: { cartId, productId} },
            create: { cartId, productId, quantity: quantityToAdd },
            update: { quantity: { increment: quantityToAdd} }
        });
    },
    //设置商品数量
    async setCartItemQuantity(cartId: number, productId: number, quantity: number) {
        return prisma.cartItem.update({
            where: { cartId_productId: { cartId, productId} },
            data: { quantity }
        })
    },
    //移除购物车中的item
    async removeCartItem(cartId: number, productId: number) {
        return prisma.cartItem.delete({
            where: { cartId_productId: { cartId, productId} }
        });
    },

    async clearCart(cartId: number) {
        return prisma.cartItem.deleteMany({
            where: { cartId }
        });
    }
};