//jwt工具

import jwt from "jsonwebtoken";
import { env } from "./env";

export interface JwtPayload {
    userId: number;
    email: string;
    role: string;
}

//生成token
export function signToken(payload: JwtPayload): string {
    return jwt.sign(payload, env.JWT_SECRET,
        {
            expiresIn: env.JWT_EXPIRES_IN,
        } as jwt.SignOptions
    );
}

//验证token是否有效
export function verifyToken(token: string): JwtPayload {
    return jwt.verify(token, env.JWT_SECRET) as JwtPayload;
} 