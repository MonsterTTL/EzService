import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/AppError';
import { success, ZodError } from 'zod';
import { Prisma } from '@prisma/client';

export function errorHandler(
    err: Error,
    req: Request,
    res: Response,
    next: NextFunction
) {
    //业务错误
    if (err instanceof AppError) {
        return res.status(err.statusCode).json({
            success: false,
            error: {
                code: err.code || 'ERROR',
                message: err.message
            }
        });
    }

    //Zod参数校验错误
    if (err instanceof ZodError) {
        return res.status(400).json({
            success: false,
            error: {
                code: 'VALIDATION_ERROR',
                message: '请求参数错误',
                details: err.flatten().fieldErrors,
            },
        });
    }

    //prisma数据库错误
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
        //违反唯一约束
        if (err.code === 'P2002') {
            const field = (err.meta?.target as string[])?.join(', ');
            return res.status(409).json({
                success: false,
                error: { code: 'DUPLICATE_ENTRY', message: `${field} 已存在` },
            });
        }
        //记录不存在
        if (err.code === 'P2005') {
            return res.status(404).json({
                success: false,
                error: { code: 'NOT_FOUND', message: '资源不存在' },
            });
        }
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

//路由不存在
export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `接口 ${req.method} ${req.path} 不存在`,
    },
  });
}