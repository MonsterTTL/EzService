import { Request, Response, NextFunction } from 'express';
import { cartService } from '../services/cart.service';

export const cartController = {
    //获取购物车
    async getCart(req: Request, res: Response, next: NextFunction) {
        try {
            const cart = await cartService?.getCart(req?.user!.userId);
            res.json({ success: true, data: cart });
        } catch (err) {
            next(err);
        }
    },
    //添加商品到购物车
    async addToCart(req: Request, res: Response, next: NextFunction) {
        try {
            const user = req?.user;
            const item = await cartService?.addToCart(user!.userId, req.body);
            res.status(201).json({success: true, data: item});
        } catch (err) {
            next(err);
        }
    },
    //更新购物车的商品项
    async updateCartItem(req: Request, res: Response, next: NextFunction) {
        try {
            const result = await cartService.updateCartItem(
                req.user!.userId,
                parseInt(req.params.productId?.toString() || '0'),
                req.body
            );
            res.json({success: true, data: result});
        } catch (err) {
            next(err);
        }
    },
    //
    async removeFromCart(req: Request, res: Response, next: NextFunction) {
        try {
          await cartService.removeFromCart(
            req.user!.userId, 
            parseInt(req.params.productId as string)
        );
          res.json({ success: true, data: null });
        } catch (error) { next(error); }
    },
    
    async clearCart(req: Request, res: Response, next: NextFunction) {
    try {
        await cartService.clearCart(req.user!.userId);
        res.json({ success: true, data: null });
    } catch (error) { next(error); }
    },
}