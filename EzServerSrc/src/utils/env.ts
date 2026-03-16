
function getEnv(key: string): string {
    const value = process.env[key];
    if (!value) {
        throw new Error(`环境变量 ${key} 未设置，请检查`);
    }
    return value;
}

export const env = {
    PORT: parseInt(process.env.PORT || '3000', 10),
    NODE_ENV: process.env.NODE_ENV || 'development',
    DATABASE_URL: getEnv('DATABASE_URL'),
    JWT_SECRET: getEnv('JWT_SECRET'),
    JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
};