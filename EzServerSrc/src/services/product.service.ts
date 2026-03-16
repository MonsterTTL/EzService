import { productRepository } from '../repositories/product.repository';
import { AppError } from '../utils/AppError';
import { CreateProductDto, UpdateProductDto, ProductQuery } from '../types/product.schemas';

export const productService = {
    async getProducts(query: ProductQuery) {
      return productRepository.findMany(query);
    },
  
    async getProductById(id: number) {
      const product = await productRepository.findById(id);
      if (!product) {
        throw new AppError('商品不存在', 404, 'PRODUCT_NOT_FOUND');
      }
      return product;
    },
  
    async createProduct(dto: CreateProductDto, imageUrls: string[]) {
      return productRepository.create({ ...dto, imageUrls });
    },
  
    async updateProduct(id: number, dto: UpdateProductDto, newImageUrls?: string[]) {
      await this.getProductById(id); // 验证存在
      const data: any = { ...dto };
      if (newImageUrls && newImageUrls.length > 0) {
        data.imageUrls = newImageUrls;
      }
      return productRepository.update(id, data);
    },
  
    async deleteProduct(id: number) {
      await this.getProductById(id); // 验证存在
      await productRepository.delete(id);
    },
  };