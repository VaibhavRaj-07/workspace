import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { ApiError } from '../utils/api-error.js';
import { ERROR_CODES } from '../config/constants.js';

export interface JwtUserPayload {
  id: string;
  email: string;
  name: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: JwtUserPayload;
      token?: string;
    }
  }
}

export function authenticateJWT(req: Request, _res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new ApiError(401, 'Authentication token missing or invalid', ERROR_CODES.UNAUTHORIZED));
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as JwtUserPayload;
    req.user = {
      id: decoded.id,
      email: decoded.email,
      name: decoded.name,
    };
    req.token = token;
    next();
  } catch (err: any) {
    if (err.name === 'TokenExpiredError') {
      return next(new ApiError(401, 'Authentication token expired', ERROR_CODES.UNAUTHORIZED));
    }
    return next(new ApiError(401, 'Invalid authentication token', ERROR_CODES.UNAUTHORIZED));
  }
}
