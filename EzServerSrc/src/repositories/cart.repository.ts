import prisma from "../prisma";

export const cartRepository = {

    async getOrCreateCart(userId: number) {
        return prisma.cart.upsert({
            where: { userId },
            create: { userId },
            update: {},
            
        });
    }
};