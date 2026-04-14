import prisma from '../prisma';
import { cartRepository } from '../repositories/cart.repository';
import { AppError } from '../utils/AppError';
import { AddToCartDto, UpdateCartItemDto } from '../types/cart.schemas';
import { productRepository } from '../repositories/product.repository';



export const cartService = {
    //获取购物车
    async getCart(userId: number) {
        const cart = await cartRepository.getOrCreateCart(userId);

        const totalAmount = cart.items?.reduce( (sum, item) => {
            return sum + (Number(item.product.price) * item.quantity);
        }, 0);

        return { ...cart, totalAmount }
    },
    //
    async addToCart(userId: number, dto: AddToCartDto) {
        return prisma.$transaction( async(tx) => {

            const product = await tx.product.findUnique({
                where: { id: dto.productId }
            });

            if (!product) {
                throw new AppError('商品不存在', 404, 'Not Found');
            }

            if (product.stock < dto.quantity) {
                throw new AppError(`商品库存不足,当前:${product.stock}`, 400, 'INSUFFICIENT_STOCK');
            }

            //获取或创建购物车
            const cart = await tx.cart.upsert({
                where: { userId },
                create: { userId },
                update: {}
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
    //更新购物车
    async updateCartItem(userId: number, productId: number, updataCartItemDto: UpdateCartItemDto) {
        const cart = await cartRepository.getOrCreateCart(userId);
        const cartItem = await cartRepository.getCartItem(cart.id, productId);
        
        if (!cartItem) {
            throw new AppError('购物车中没有该商品', 404, 'ITEM_NOT_FOUND');
        }
        //如果数量为0就直接移除
        if (updataCartItemDto.quantity == 0) {
            await cartRepository.removeCartItem(cart.id, productId);
        }
        //更新数量
        await cartRepository.setCartItemQuantity(cart.id, productId, updataCartItemDto.quantity);
    },
    //从购物车里移除商品
    async removeFromCart(userId: number, productId: number) {
        const cart = await cartRepository.getOrCreateCart(userId);
        const cartItem = await cartRepository.getCartItem(cart.id, productId);

        if (!cartItem) {
            throw new AppError('购物车中没有该商品', 404, 'ITEM_NOT_FOUND');
        }

        await cartRepository.removeCartItem(cart.id, productId);
    },
    //清空购物车
    async clearCart(userId: number) {
        const cart = await cartRepository.getOrCreateCart(userId);
        await cartRepository.clearCart(cart.id);
    }



}