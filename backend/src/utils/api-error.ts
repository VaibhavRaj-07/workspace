import { ERROR_CODES } from '../config/constants.js';

export class ApiError extends Error {
  public statusCode: number;
  public code: string;
  public details?: any;

  constructor(statusCode: number, message: string, code: string = ERROR_CODES.BAD_REQUEST, details?: any) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Object.setPrototypeOf(this, new.target.prototype);
  }

  static badRequest(message: string, details?: any) {
    return new ApiError(400, message, ERROR_CODES.BAD_REQUEST, details);
  }

  static unauthorized(message: string = 'Unauthorized', details?: any) {
    return new ApiError(401, message, ERROR_CODES.UNAUTHORIZED, details);
  }

  static forbidden(message: string = 'Forbidden: insufficient permissions', details?: any) {
    return new ApiError(403, message, ERROR_CODES.FORBIDDEN, details);
  }

  static notFound(message: string = 'Resource not found', details?: any) {
    return new ApiError(404, message, ERROR_CODES.NOT_FOUND, details);
  }

  static conflict(message: string, code: string = ERROR_CODES.VERSION_CONFLICT, details?: any) {
    return new ApiError(409, message, code, details);
  }

  static validationError(message: string, details?: any) {
    return new ApiError(422, message, ERROR_CODES.VALIDATION_ERROR, details);
  }

  static internal(message: string = 'Internal server error', details?: any) {
    return new ApiError(500, message, ERROR_CODES.INTERNAL_SERVER_ERROR, details);
  }
}
