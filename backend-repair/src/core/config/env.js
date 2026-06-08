const dotenv = require("dotenv");
const { z } = require("zod");

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  SERVICE_NAME: z.string().min(1).default("backend-repair"),
  LOG_LEVEL: z.string().min(1).default("debug"),
  PORT: z.coerce.number().int().positive().default(8000),
  DATABASE_URL: z.string().url(),
  SHADOW_DATABASE_URL: z.string().url().optional(),
  REDIS_URL: z.string().url().default("redis://localhost:6379"),
  REDIS_CONNECT_MAX_RETRIES: z.coerce.number().int().nonnegative().default(10),
  JWT_SECRET: z.string().min(16),
  JWT_ACCESS_TOKEN_EXPIRES_IN: z.string().min(1).default("15m"),
  JWT_REFRESH_TOKEN_EXPIRES_IN: z.string().min(1).default("7d"),
  AUTH_LOGIN_RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(15 * 60 * 1000),
  AUTH_LOGIN_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(5),
  NOTIFICATION_WORKER_CONCURRENCY: z.coerce.number().int().positive().default(5),
  SEED_ADMIN_PASSWORD: z.string().min(8).default("ChangeMe@12345"),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  const details = parsedEnv.error.issues
    .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
    .join("; ");

  throw new Error(`Invalid environment configuration: ${details}`);
}

module.exports = parsedEnv.data;
