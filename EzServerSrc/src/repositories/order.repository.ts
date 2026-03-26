import prisma from '../prisma';
import { OrderStatus } from '@prisma/client';

const ORDER_INCLUDE = {
    items: {
        include: {
            product: { select: { id: true, name: true, imageUrls: true} }
        }
    }
} as const;

