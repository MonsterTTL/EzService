import { Router } from 'express';
import { orderController } from '../controllers/order.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import { createOrderSchema, updateOrderStatusSchema } from '../types/order.schemas';

const router = Router();

//token鉴权
router.use(authenticate);

router.get('/', orderController.getMyOrders);
router.get('/:id', orderController.getOrderById);
router.post('/', validate(createOrderSchema), orderController.createOrder);
router.patch('/:id/status', validate(updateOrderStatusSchema), orderController.updateOrderStatus);

export default router;


