/**  订单状态流转
 *                 ┌──────────────────────────────────────────┐
                    │                                          │
    PENDING ──── PAID ──── SHIPPED ──── COMPLETED             │
    │                                                        │
    └──────────────────── CANCELLED ────────────────────────┘
    （只有 PENDING/PAID 状态可以取消）
 */
import { OrderStatus } from '@prisma/client';

//定义合法的状态转移
const VALID_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
    PENDING: [OrderStatus.PAID, OrderStatus.CANCELLED],
    PAID: [OrderStatus.SHIPPED, OrderStatus.CANCELLED],
    SHIPPED: [OrderStatus.COMPLETED],
    COMPLETED: [],
    CANCELLED: []
};

//是否可以流转
export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
    return VALID_TRANSITIONS[from].includes(to);
}

// 状态的中文说明（用于错误提示）
export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
    PENDING:   '待支付',
    PAID:      '已支付',
    SHIPPED:   '已发货',
    COMPLETED: '已完成',
    CANCELLED: '已取消',
  };