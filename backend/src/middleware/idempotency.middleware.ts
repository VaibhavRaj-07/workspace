import { Request, Response, NextFunction } from 'express';
import { prisma } from '../db/prisma.js';
import { logger } from '../config/logger.js';

export async function handleIdempotency(req: Request, res: Response, next: NextFunction) {
  if (req.method !== 'POST') {
    return next();
  }

  const idempotencyKey = req.header('Idempotency-Key');
  if (!idempotencyKey) {
    return next();
  }

  const userId = req.user?.id || 'anonymous';

  try {
    const existingRecord = await prisma.idempotencyRecord.findUnique({
      where: { key: idempotencyKey },
    });

    if (existingRecord) {
      if (existingRecord.expiresAt > new Date()) {
        logger.info(`[Idempotency] Returning cached response for key: ${idempotencyKey}`);
        return res
          .status(existingRecord.statusCode)
          .setHeader('X-Cache-Lookup', 'HIT-IDEMPOTENCY')
          .json(existingRecord.responseBody);
      } else {
        // Expired, delete it
        await prisma.idempotencyRecord.delete({ where: { key: idempotencyKey } });
      }
    }

    // Intercept json response
    const originalJson = res.json.bind(res);
    res.json = function (body: any) {
      const statusCode = res.statusCode;

      // Only cache successful or non-server-error responses
      if (statusCode < 500) {
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

        prisma.idempotencyRecord
          .create({
            data: {
              key: idempotencyKey,
              userId,
              statusCode,
              responseBody: body,
              expiresAt,
            },
          })
          .catch((err) => {
            logger.warn({ err }, `Failed to store idempotency record for key ${idempotencyKey}`);
          });
      }

      return originalJson(body);
    };

    next();
  } catch (error) {
    logger.error({ error }, 'Idempotency middleware error');
    next();
  }
}
