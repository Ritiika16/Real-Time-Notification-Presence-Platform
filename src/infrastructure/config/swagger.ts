import swaggerJsdoc from 'swagger-jsdoc';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Distributed Real-Time Notification & Presence Platform API',
      version: '1.0.0',
      description: 'Production-grade authentication and notification system with real-time Socket.IO support',
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Development server',
      },
    ],
    components: {
      schemas: {
        RegisterRequest: {
          type: 'object',
          required: ['email', 'password', 'fullName'],
          properties: {
            email: {
              type: 'string',
              format: 'email',
              example: 'user@example.com',
            },
            password: {
              type: 'string',
              minLength: 8,
              example: 'Password@123',
              description: 'Must contain uppercase, lowercase, number, and special character',
            },
            fullName: {
              type: 'string',
              minLength: 2,
              maxLength: 100,
              example: 'John Doe',
            },
          },
        },
        LoginRequest: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: {
              type: 'string',
              format: 'email',
              example: 'user@example.com',
            },
            password: {
              type: 'string',
              example: 'Password@123',
            },
          },
        },
        AuthResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true,
            },
            user: {
              type: 'object',
              properties: {
                id: {
                  type: 'string',
                  format: 'uuid',
                },
                email: {
                  type: 'string',
                  format: 'email',
                },
                fullName: {
                  type: 'string',
                },
                createdAt: {
                  type: 'string',
                  format: 'date-time',
                },
              },
            },
            accessToken: {
              type: 'string',
              description: 'JWT access token (expires in 15 minutes)',
            },
            refreshToken: {
              type: 'string',
              description: 'JWT refresh token (expires in 7 days)',
            },
          },
        },
        UserResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true,
            },
            user: {
              type: 'object',
              properties: {
                id: {
                  type: 'string',
                  format: 'uuid',
                },
                email: {
                  type: 'string',
                  format: 'email',
                },
                fullName: {
                  type: 'string',
                },
                createdAt: {
                  type: 'string',
                  format: 'date-time',
                },
                updatedAt: {
                  type: 'string',
                  format: 'date-time',
                },
              },
            },
          },
        },
        Notification: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
            },
            senderId: {
              type: 'string',
              format: 'uuid',
            },
            receiverId: {
              type: 'string',
              format: 'uuid',
            },
            title: {
              type: 'string',
            },
            message: {
              type: 'string',
            },
            type: {
              type: 'string',
              enum: ['INFO', 'MESSAGE', 'ALERT', 'SYSTEM'],
            },
            status: {
              type: 'string',
              enum: ['PENDING', 'DELIVERED', 'READ'],
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
            },
            deliveredAt: {
              type: 'string',
              format: 'date-time',
              nullable: true,
            },
            readAt: {
              type: 'string',
              format: 'date-time',
              nullable: true,
            },
          },
        },
        NotificationWithSender: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
            },
            senderId: {
              type: 'string',
              format: 'uuid',
            },
            receiverId: {
              type: 'string',
              format: 'uuid',
            },
            title: {
              type: 'string',
            },
            message: {
              type: 'string',
            },
            type: {
              type: 'string',
              enum: ['INFO', 'MESSAGE', 'ALERT', 'SYSTEM'],
            },
            status: {
              type: 'string',
              enum: ['PENDING', 'DELIVERED', 'READ'],
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
            },
            deliveredAt: {
              type: 'string',
              format: 'date-time',
              nullable: true,
            },
            readAt: {
              type: 'string',
              format: 'date-time',
              nullable: true,
            },
            sender: {
              type: 'object',
              properties: {
                id: {
                  type: 'string',
                  format: 'uuid',
                },
                email: {
                  type: 'string',
                  format: 'email',
                },
                fullName: {
                  type: 'string',
                },
              },
            },
          },
        },
        PaginationMeta: {
          type: 'object',
          properties: {
            page: {
              type: 'integer',
              example: 1,
            },
            limit: {
              type: 'integer',
              example: 20,
            },
            total: {
              type: 'integer',
              example: 100,
            },
            totalPages: {
              type: 'integer',
              example: 5,
            },
            hasNextPage: {
              type: 'boolean',
              example: true,
            },
            hasPreviousPage: {
              type: 'boolean',
              example: false,
            },
          },
        },
        OnlineUser: {
          type: 'object',
          properties: {
            userId: {
              type: 'string',
              format: 'uuid',
            },
            email: {
              type: 'string',
              format: 'email',
            },
            connectedAt: {
              type: 'string',
              format: 'date-time',
            },
          },
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false,
            },
            error: {
              type: 'string',
            },
            details: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  path: {
                    type: 'array',
                    items: {
                      type: 'string',
                    },
                  },
                  message: {
                    type: 'string',
                  },
                },
              },
            },
          },
        },
      },
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
  },
  apis: ['./src/api/routes/*.ts'],
};

export const swaggerSpec = swaggerJsdoc(options);
