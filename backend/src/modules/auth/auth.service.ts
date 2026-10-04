import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { prisma } from '../../db/prisma.js';
import { env } from '../../config/env.js';
import { ApiError } from '../../utils/api-error.js';
import { ERROR_CODES } from '../../config/constants.js';
import { RegisterInput, LoginInput } from './auth.schema.js';

export class AuthService {
  private generateTokens(user: { id: string; email: string; name: string }) {
    const accessToken = jwt.sign(
      { id: user.id, email: user.email, name: user.name },
      env.JWT_SECRET,
      { expiresIn: env.JWT_EXPIRES_IN as any }
    );

    const refreshToken = jwt.sign(
      { id: user.id, email: user.email, name: user.name },
      env.JWT_REFRESH_SECRET,
      { expiresIn: env.JWT_REFRESH_EXPIRES_IN as any }
    );

    return { accessToken, refreshToken };
  }

  async register(input: RegisterInput) {
    const existingUser = await prisma.user.findUnique({
      where: { email: input.email.toLowerCase() },
    });

    if (existingUser) {
      throw new ApiError(
        409,
        'User with this email already exists',
        ERROR_CODES.ALREADY_EXISTS
      );
    }

    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(input.password, saltRounds);

    const user = await prisma.user.create({
      data: {
        name: input.name,
        email: input.email.toLowerCase(),
        passwordHash,
        avatarUrl: input.avatarUrl || null,
      },
      select: {
        id: true,
        name: true,
        email: true,
        avatarUrl: true,
        createdAt: true,
      },
    });

    const tokens = this.generateTokens(user);

    return {
      user,
      tokens,
    };
  }

  async login(input: LoginInput) {
    const user = await prisma.user.findUnique({
      where: { email: input.email.toLowerCase() },
    });

    if (!user) {
      throw new ApiError(401, 'Invalid email or password', ERROR_CODES.UNAUTHORIZED);
    }

    const isPasswordValid = await bcrypt.compare(input.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new ApiError(401, 'Invalid email or password', ERROR_CODES.UNAUTHORIZED);
    }

    const userSafe = {
      id: user.id,
      name: user.name,
      email: user.email,
      avatarUrl: user.avatarUrl,
      createdAt: user.createdAt,
    };

    const tokens = this.generateTokens(userSafe);

    return {
      user: userSafe,
      tokens,
    };
  }

  async refresh(refreshToken: string) {
    try {
      const decoded = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET) as {
        id: string;
        email: string;
        name: string;
      };

      const user = await prisma.user.findUnique({
        where: { id: decoded.id },
        select: {
          id: true,
          name: true,
          email: true,
          avatarUrl: true,
          createdAt: true,
        },
      });

      if (!user) {
        throw new ApiError(401, 'User no longer exists', ERROR_CODES.UNAUTHORIZED);
      }

      const tokens = this.generateTokens(user);

      return {
        user,
        tokens,
      };
    } catch (err) {
      throw new ApiError(401, 'Invalid or expired refresh token', ERROR_CODES.UNAUTHORIZED);
    }
  }

  async getCurrentUser(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        avatarUrl: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new ApiError(404, 'User not found', ERROR_CODES.NOT_FOUND);
    }

    return user;
  }
}

export const authService = new AuthService();
