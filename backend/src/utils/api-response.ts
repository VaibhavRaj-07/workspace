import { Response } from 'express';

export interface PaginationMeta {
  page?: number;
  limit?: number;
  total?: number;
  totalPages?: number;
  hasNextPage?: boolean;
  hasPrevPage?: boolean;
  nextCursor?: string | null;
}

export class ApiResponse {
  static success<T>(res: Response, data: T, statusCode: number = 200, meta?: PaginationMeta) {
    return res.status(statusCode).json({
      success: true,
      data,
      ...(meta ? { pagination: meta } : {}),
    });
  }

  static created<T>(res: Response, data: T, meta?: PaginationMeta) {
    return ApiResponse.success(res, data, 201, meta);
  }

  static noContent(res: Response) {
    return res.status(204).send();
  }

  static error(
    res: Response,
    statusCode: number,
    code: string,
    message: string,
    details?: any
  ) {
    return res.status(statusCode).json({
      error: {
        code,
        message,
        ...(details !== undefined ? { details } : {}),
      },
    });
  }
}
