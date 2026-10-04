import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../utils/api-error.js';
import { ApiResponse } from '../utils/api-response.js';
import { logger } from '../config/logger.js';
import { ERROR_CODES } from '../config/constants.js';

export function errorHandler(
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  if (err instanceof ApiError) {
    return ApiResponse.error(res, err.statusCode, err.code, err.message, err.details);
  }

  // Handle Multer upload errors
  if (err.name === 'MulterError') {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return ApiResponse.error(
        res,
        413,
        ERROR_CODES.FILE_TOO_LARGE,
        'Uploaded file exceeds maximum allowed size of 10MB',
        err
      );
    }
    return ApiResponse.error(res, 400, ERROR_CODES.BAD_REQUEST, err.message, err);
  }

  // Handle Prisma errors
  if (err.code === 'P2002') {
    const target = err.meta?.target || 'field';
    return ApiResponse.error(
      res,
      409,
      ERROR_CODES.ALREADY_EXISTS,
      `A resource with this unique ${target} already exists.`,
      err.meta
    );
  }

  if (err.code === 'P2025') {
    return ApiResponse.error(
      res,
      404,
      ERROR_CODES.NOT_FOUND,
      'Resource not found in database',
      err.meta
    );
  }

  // Uncaught exceptions
  logger.error({ err }, 'Unhandled server error');
  const message =
    process.env.NODE_ENV === 'production'
      ? 'An unexpected error occurred on the server'
      : err.message || 'Internal server error';

  return ApiResponse.error(
    res,
    500,
    ERROR_CODES.INTERNAL_SERVER_ERROR,
    message,
    process.env.NODE_ENV === 'development' ? err.stack : undefined
  );
}
