//鉴权中间件
import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt';
import { AppError } from '../utils/AppError';

//鉴权中间件函数
export function authenticate(req: Request, res: Response, next: NextFunction) {

    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return next(new AppError('没有认证token', 401, 'UNAUTHORIZED'));
    }

    const token = authHeader.split(' ')[1];

    try {
        const payload = verifyToken(token);
        req.user = payload;
        next();
    } catch (err) {
        return next(new AppError('Token 无效或已过期', 401, 'TOKEN_INVALID'));
    }
}

//认证角色权限是否足够
export function authorize(...roles: string[]) {
    return (req: Request, res: Response, next: NextFunction) => {
        if (!req.user) {
            return next(new AppError('未认证', 401, 'UNAUTHORIZED'));
        }
        if (!roles.includes(req.user.role)) {
            return next(new AppError('权限不足', 403, 'FORBIDDEN'));
        }
        next();
    }
}