import bcrypt from 'bcryptjs';
import { userRepository } from '../repositories/user.repository';
import { signToken } from '../utils/jwt';
import { AppError } from '../utils/AppError';
import { register } from 'node:module';

export const authService = {
    //注册
    async register(email: string, password: string, name: string) {
        const existing = await userRepository.findByEmail(email);
        if (existing) {
            throw new AppError('该邮箱已注册', 409, 'EMAIL_EXIST');
        }

        const passwordHash = await bcrypt.hash(password, 12);
        const user = await userRepository.create({ email, passwordHash, name });
        const token = signToken({
            userId: user.id,
            email: user.email,
            role: user.role
        });

        return {
            token,
            user: {
                id: user.id,
                email: user.email,
                role: user.role
            }
        };
    },
    async login(email: string, password: string) {
        //查找用户
        const user = await userRepository.findByEmail(email);

        const dummyHash = '$2a$12$dummyhashfortimingattackprevention00000000';
        const passwordHash = user?.passwordHash ?? dummyHash;
        const isValid = await bcrypt.compare(password, passwordHash);

        if (!user || !isValid) {
            throw new AppError('邮箱或密码错误', 401, 'INVALID_CREDENTIALS');
        }

        const token = signToken({ userId: user.id, email: user.email, role: user.role });
        return {
            token,
            user: { id: user.id, email: user.email, name: user.name, role: user.role }
        };
    }


}