import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/AppError';

export function errorHandler(
    err: Error,
    req: Request,
    res: Response,
    next: NextFunction
) {
    if (err instanceof AppError) {
        return res.status(err.statusCode).json({
            success: false,
            error: {
                code: err.code || 'ERROR',
                message: err.message
            }
        });
    }

    // 未知错误（Bug），不暴露细节给客户端
    console.error('未知错误:', err);
    return res.status(500).json({
        success: false,
        error: {
        code: 'INTERNAL_ERROR',
        message: '服务器内部错误',
        },
    });
}