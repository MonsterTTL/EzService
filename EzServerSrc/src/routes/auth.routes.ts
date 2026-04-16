import { Router } from 'express';
import { authController } from '../controllers/auth.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();

/**
 * @swagger
 * /api/auth/register:
 *  post:
 *      summary: 用户注册
 *      tags: [认证]
 *      requestBody:
 *          required: true
 *          content:
 *              application/json:
 *                  schema:
 *                      type: object
 *                      required: [email, password, name]
 *                      properties:
 *                          email:
 *                              type: string
 *                              format: email
 *                              example: user@example.com
 *                          password:
 *                              type: string
 *                              minLength: 6
 *                              example: password123
 *                          name:
 *                              type: string
 *                              example: 张三
 *      responses:
 *          201:
 *              description: 注册成功，返回 Token 和用户信息
 *          409:
 *              description: 邮箱已注册
 */
router.post('/register', authController.register);

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: 用户登录
 *     tags: [认证]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *                 example: user@example.com
 *               password:
 *                 type: string
 *                 example: password123
 *     responses:
 *       200:
 *         description: 登录成功
 *       401:
 *         description: 邮箱或密码错误
 */
router.post('/login', authController.login);

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: 获取当前用户信息
 *     tags: [认证]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: 用户信息
 *       401:
 *         description: 未认证
 */
router.get('/me', authenticate, authController.getMe);

export default router;