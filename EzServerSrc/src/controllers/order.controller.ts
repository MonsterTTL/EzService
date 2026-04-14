import { Request, Response, NextFunction } from 'express';
import { orderService } from '../services/order.service';
import { OrderStatus } from '@prisma/client';

export const orderController = {
    async getMyOrders(req: Request, res: Response, next: NextFunction) {
        try {
            const orders = await orderService.getMyOrders(Number(req.user?.userId));
            res.json({success: true, data: orders})
        } catch (err) {
            next(err);
        }
    },

    async getOrderById(req: Request, res: Response, next: NextFunction) {
        try {
            const order = await orderService.getOrderById(parseInt(String(req.params.id)), parseInt(String(req.user?.userId)));
            res.json({success: true, data: order});
        } catch (err) {
            next(err);
        }
    },

    async createOrder(req: Request, res: Response, next: NextFunction) {
        try {
          const order = await orderService.createOrder(req.user!.userId, req.body);
          res.status(201).json({ success: true, data: order });
        } catch (error) { next(error); }
    },
    
    async updateOrderStatus(req: Request, res: Response, next: NextFunction) {
        try {
            const isAdmin = req.user!.role === 'ADMIN';
            const order = await orderService.updateOrderStatus(
            parseInt(String(req.params.id)),
            req.body.status as OrderStatus,
            req.user!.userId,
            isAdmin
            );
            res.json({ success: true, data: order });
        } catch (error) { next(error); }
    },
    
}