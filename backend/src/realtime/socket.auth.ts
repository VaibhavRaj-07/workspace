import { Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { JwtUserPayload } from '../middleware/auth.middleware.js';
import { logger } from '../config/logger.js';

export function socketAuthMiddleware(socket: Socket, next: (err?: Error) => void) {
  try {
    const token =
      socket.handshake.auth?.token ||
      (socket.handshake.headers.authorization?.startsWith('Bearer ')
        ? socket.handshake.headers.authorization.split(' ')[1]
        : null);

    if (!token) {
      return next(new Error('Authentication token required'));
    }

    const decoded = jwt.verify(token, env.JWT_SECRET) as JwtUserPayload;
    socket.data.user = {
      id: decoded.id,
      email: decoded.email,
      name: decoded.name,
    };

    next();
  } catch (err: any) {
    logger.warn({ err: err.message }, 'Socket authentication failed');
    next(new Error('Invalid or expired socket token'));
  }
}
