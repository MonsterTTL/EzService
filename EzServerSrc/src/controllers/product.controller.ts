import { Request, Response, NextFunction } from 'express';
import { productService } from '../services/product.service';
import { ProductQuery } from '../types/product.schemas';
import multer, { Multer } from 'multer';

export const productController = {
    async getProducts(req: Request, res: Response, next: NextFunction) {
        try {
            const result = await productService.getProducts(req.query as any as ProductQuery);
            res.json({ success: true, data: result });
        } catch (err) {
            next(err);
        }
    },
    
    async getProductById(req: Request, res: Response, next: NextFunction) {
        try {
            const result = await productService.getProductById(parseInt(req.params.id as string));
            res.json({ success: true, data: result});
        } catch (err) {
            next(err);
        }
    },

    async createProduct(req: Request, res: Response, next: NextFunction) {
        try {
            const files = req.files as Express.Multer.File[];
            const newImageUrls = files?.map(f => `/uploads/${f.filename}`);
    
            const product = await productService.createProduct(
                req.body,
                newImageUrls
            );
            res.status(201).json({ success: true, data: product });
        } catch (err) {
            next(err);
        }

    },

    async updateProduct(req: Request, res: Response, next: NextFunction) {
        try {
            const files = req.files as Express.Multer.File[];
            const newImageUrls = files?.map(f => `/uploads/${f.filename}`);

            const product = await productService.updateProduct(
                parseInt(req.params.id as string),
                req.body,
                newImageUrls
            );
            res.json({ success: true, data: product});
        } catch (err) {
            next(err);
        }
    },

    async deleteProduct(req: Request, res: Response, next: NextFunction) {
        try {
            const product = productService.deleteProduct(parseInt(req.params.id as string));
            res.json({ success: true, data: null });
        } catch (err) {
            next(err);
        }
    }
}