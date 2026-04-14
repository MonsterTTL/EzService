import { Router } from 'express';
import { cartController } from '../controllers/cart.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import { addToCartSchema, updateCartItemSchema } from '../types/cart.schemas';

const router = Router();
//鉴权
router.use(authenticate);

router.get('/', cartController.getCart);
router.post('/items', validate(addToCartSchema), cartController.addToCart);
router.put('/items/:productId', validate(updateCartItemSchema), cartController.updateCartItem);
router.delete('/items/:productId', cartController.removeFromCart);
router.delete('/', cartController.clearCart);

export default router;