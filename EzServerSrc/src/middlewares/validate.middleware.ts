import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';

export function validate(
    schema: ZodSchema, 
    target: 'body' | 'query' | 'params' = 'body'
) {
    //参数验证中间件函数
    return (req: Request, res: Response, next: NextFunction) => {
        //从request的指定字段验证参数是否符合schema要求
        const result = schema.safeParse(req[target]);
        //如果验证失败就抛出异常
        if (!result.success) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'VALIDATION_ERROR',
                    message: '请求参数错误',
                    details: result.error.flatten().fieldErrors,
                }
            });
        }
        //如果验证成功就把转换后的数据放到data字段里
        req[target] = result.data;
        next();
    }
}