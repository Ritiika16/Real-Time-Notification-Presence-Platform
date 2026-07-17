import { prisma } from '../../infrastructure/database/prisma';
import { hashPassword, comparePassword } from '../../infrastructure/auth/password';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyToken,
  TokenPayload,
} from '../../infrastructure/auth/jwt';
import { RegisterInput, LoginInput } from '../../shared/utils/validation';
import { Logger } from 'winston';

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

interface AuthResult {
  success: boolean;
  user: {
    id: string;
    email: string;
    fullName: string;
    createdAt: Date;
  };
  accessToken: string;
  refreshToken: string;
}

export class AuthService {
  constructor(private readonly logger: Logger) {}

  async register(input: RegisterInput): Promise<AuthResult> {
    const existingUser = await prisma.user.findUnique({
      where: { email: input.email },
    });

    if (existingUser) {
      this.logger.warn('Registration attempt with existing email', { email: input.email });
      throw new Error('Email already registered');
    }

    const passwordHash = await hashPassword(input.password);

    const user = await prisma.user.create({
      data: {
        email: input.email,
        passwordHash,
        fullName: input.fullName,
      },
    });

    this.logger.info('User registered successfully', { userId: user.id, email: user.email });

    const tokens = this.generateTokens(user.id, user.email);

    return {
      success: true,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        createdAt: user.createdAt,
      },
      ...tokens,
    };
  }

  async login(input: LoginInput): Promise<AuthResult> {
    const user = await prisma.user.findUnique({
      where: { email: input.email },
    });

    if (!user) {
      this.logger.warn('Login attempt with non-existent email', { email: input.email });
      throw new Error('Invalid credentials');
    }

    const isValidPassword = await comparePassword(input.password, user.passwordHash);

    if (!isValidPassword) {
      this.logger.warn('Login attempt with invalid password', { email: input.email });
      throw new Error('Invalid credentials');
    }

    this.logger.info('User logged in successfully', { userId: user.id, email: user.email });

    const tokens = this.generateTokens(user.id, user.email);

    return {
      success: true,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        createdAt: user.createdAt,
      },
      ...tokens,
    };
  }

  async getUserById(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        fullName: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new Error('User not found');
    }

    return user;
  }

  verifyAccessToken(token: string, secret: string): TokenPayload {
    try {
      return verifyToken(token, secret);
    } catch (error) {
      this.logger.warn('Invalid access token verification attempt');
      throw new Error('Invalid token');
    }
  }

  private generateTokens(userId: string, email: string): AuthTokens {
    const payload: TokenPayload = { userId, email };
    const accessTokenSecret = process.env['JWT_SECRET'] || '';
    const refreshTokenSecret = process.env['JWT_REFRESH_SECRET'] || '';

    const accessToken = generateAccessToken(payload, accessTokenSecret);
    const refreshToken = generateRefreshToken(payload, refreshTokenSecret);

    return { accessToken, refreshToken };
  }
}
