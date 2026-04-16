import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'EZ Server API',
            version: '1.0.0',
            description: '电商后台 API 文档'
        },
        servers: [
            {
                url: 'https://localhost:3000',
                description: '本地开发环境'
            },
        ],
        components: {
            securitySchemes: {
                BearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                },
            },
        },
    },
    //应当去哪里找 @swagger 注释
    apis: ['./src/routes/*.ts'],
}

export const swaggerSpec = swaggerJsdoc(options);