import { Router } from 'express';
import { productController } from '../controllers/product.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import { uploadImages } from '../middlewares/upload.middleware';
import { createProductSchema, productQuerySchema, updateProductSchema } from '../types/product.schemas';
import router from './auth.routes';

router.get('/', validate(productQuerySchema, 'query'), productController.getProducts);
router.get('/:id', productController.getProductById);

//管理员接口 -- 创建商品
router.post(
    '/',
    //鉴权token
    authenticate,
    //鉴权是否有管理员身份
    authorize('ADMIN'),
    //上传所有图片
    uploadImages,
    //验证参数正确
    validate(createProductSchema),
    productController.createProduct
);
//更新商品
router.put(
    '/',
    authenticate,
    authorize('ADMIN'),
    uploadImages,
    validate(updateProductSchema),
    productController.updateProduct
);

//删除商品
router.delete(
    '/',
    authenticate,
    authorize('ADMIN'),
    productController.deleteProduct
);