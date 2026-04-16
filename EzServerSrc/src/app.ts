import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.routes';
import productRouter from './routes/product.routes';
import cartRoutes from './routes/cart.routes';
import orderRouter from './routes/order.routes'
import { errorHandler, notFoundHandler } from './middlewares/error.middleware';
import morgan from 'morgan';
//swagger
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './utils/swagger';


//环境初始化
dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;
//日志格式
const morganFormater = process.env.NODE_ENV === 'prod' ? 'combined' : 'dev';
app.use(morgan(morganFormater));

if (process.env.NODE_ENV !== 'prod') {
    app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
    console.log(`📚 API 文档: http://localhost:${PORT}/api-docs`);
}

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
app.use('/api/orders', orderRouter);

//检查服务健康度
app.get('/health', (req: Request, res: Response) => {
    res.json({
        status: 'ok',
        message: 'EzServer is running!',
        timestamp: new Date().toISOString(),
    });
});

app.use(notFoundHandler);
//错误处理路由
app.use(errorHandler);

//启动服务器
//开始监听
app.listen(PORT, () => {
    console.log(`🚀 Server is running on http://localhost:${PORT}`);
    console.log(`📋 Health check: http://localhost:${PORT}/health`);
});

export default app;