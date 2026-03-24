import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.routes';
import productRouter from './routes/product.routes';
import cartRoutes from './routes/cart.routes';
import { errorHandler } from './middlewares/error.middleware';

//环境初始化
dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;

//配置中间件
//HTTP请求头
app.use(helmet());
//跨域
app.use(cors());
//json转换
app.use(express.json());

//路由
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));
app.use('/api/auth', authRoutes);
app.use('/api/products', productRouter);
app.use('/api/cart', cartRoutes);

//检查服务健康度
app.get('/health', (req: Request, res: Response) => {
    res.json({
        status: 'ok',
        message: 'EzServer is running!',
        timestamp: new Date().toISOString(),
    });
});

//错误处理路由
app.use(errorHandler);

//启动服务器
//开始监听
app.listen(PORT, () => {
    console.log(`🚀 Server is running on http://localhost:${PORT}`);
    console.log(`📋 Health check: http://localhost:${PORT}/health`);
});

export default app;