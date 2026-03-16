import prisma from '../prisma';

export const userRepository = {
    // 根据邮箱查找
    findByEmail(email: string) {
        return prisma.user.findUnique({ where: { email }});
    },
    // 根据Id
    findById(id: number) {
        return prisma.user.findUnique({
            where: { id },
            select: { 
                id: true, 
                email: true, 
                name: true, 
                role: true,
                avatarUrl: true,
                createdAt: true
            }
        })
    },
    // 创建用户
    create(
        data: {
        email: string;
        passwordHash: string;
        name: string;
    }) {
        return prisma.user.create({ data });
    }
}