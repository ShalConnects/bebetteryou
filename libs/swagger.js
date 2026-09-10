import swaggerJsdoc from 'swagger-jsdoc'
import { appConfig } from '@/config/app'

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: `${appConfig.name} API`,
      version: '1.0.0',
      description: `API documentation for ${appConfig.name} with authentication, payments, and modern features`,
      contact: {
        name: 'API Support',
        email: appConfig.supportEmail,
      },
    },
    servers: [
      {
        url: appConfig.url,
        description: 'Development server',
      },
      {
        url: appConfig.siteUrl,
        description: 'Production server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: [
    './app/api/**/*.js',
    './app/api/**/*.ts',
    './app/api/**/route.js',
    './app/api/**/route.ts',
  ],
}

export const swaggerSpec = swaggerJsdoc(options)

