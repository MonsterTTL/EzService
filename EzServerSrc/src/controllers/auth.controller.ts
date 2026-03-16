import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth.service';


export const authController = {
    async register(req: Request, res: Response, next: NextFunction) {
        try {
            const { email, password, name } = req.body;

            if (!email || !password || !name) {
                return res.status(400).json({
                    success: false,
                    error: { code: 'MISSING_FIELDS', message: '请填写所有字段'}
                })
            }

            const result = await authService.register(email, password, name);
            res.status(201).json({ success: true, data: result });
        } catch (err) {
            next(err);
        }

    },

    async login(req: Request, res: Response, next: NextFunction) {
        try {
            const { email, password } = req.body;
            const result = await authService.login(email, password);
            res.json({ success: true, data: result});
        } catch (error) {
            next(error);
        }
    },

    async getMe(req: Request, res: Response, next: NextFunction) {
        try {
            res.json({ success: true, data: req.user });
        } catch (error) {
            next(error);
        }
    }
}