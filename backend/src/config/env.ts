import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(5000),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  JWT_SECRET: z.string().default('default-jwt-secret-for-dev-only-32chars'),
  JWT_EXPIRES_IN: z.string().default('1h'),
  JWT_REFRESH_SECRET: z.string().default('default-jwt-refresh-secret-dev-32ch'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  CORS_ORIGIN: z.string().default('*'),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(900000),
  RATE_LIMIT_MAX: z.coerce.number().default(1000),
  STORAGE_PROVIDER: z.enum(['local', 'supabase']).default('local'),
  UPLOAD_DIR: z.string().default('./uploads'),
  MAX_FILE_SIZE_BYTES: z.coerce.number().default(10485760), // 10MB
  SUPABASE_URL: z.string().optional(),
  SUPABASE_KEY: z.string().optional(),
  SUPABASE_BUCKET: z.string().default('attachments'),
  SOCKET_EVENT_BUFFER_SIZE: z.coerce.number().default(500),
  REDIS_URL: z.string().optional(),
  DEADLINE_CHECK_CRON: z.string().default('*/5 * * * *'),
  ML_SERVICE_URL: z.string().default('http://localhost:8000'),
  AI_FEATURES_ENABLED: z.coerce.boolean().default(true),
  ANTHROPIC_API_KEY: z.string().optional(),
  AI_PII_OPTOUT: z.coerce.boolean().default(false),
  SIMILARITY_THRESHOLD: z.coerce.number().default(0.80),
});

const _env = envSchema.safeParse(process.env);

if (!_env.success) {
  console.error('❌ Invalid environment variables:', _env.error.format());
  // Don't crash in test mode if some optional vars are unset
  if (process.env.NODE_ENV !== 'test') {
    process.exit(1);
  }
}

export const env = _env.success ? _env.data : envSchema.parse({
  ...process.env,
  DATABASE_URL: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/algo_workspace',
});
