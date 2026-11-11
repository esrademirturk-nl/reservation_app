import { z } from 'zod';

/** An empty value (FOO=) counts as "not set". */
const optional = <T extends z.ZodType>(schema: T) =>
  z.preprocess((v) => (v === '' ? undefined : v), schema.optional());

/** Environment variables are validated once at start-up; the app refuses to boot with a bad config. */
export const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.url({ protocol: /^postgres(ql)?$/ }),
  /** signs access tokens; at least 32 random characters */
  JWT_SECRET: z.string().min(32, 'must be at least 32 characters'),
  /** access token lifetime in seconds (default 15 minutes) */
  JWT_ACCESS_TTL: z.coerce.number().int().positive().default(900),
  REFRESH_TTL_DAYS: z.coerce.number().int().positive().default(30),
  /** domain of the personal forwarding addresses, e.g. esra@in.waypad.app */
  FORWARD_DOMAIN: z.string().default('in.waypad.app'),
  /** Redis for the import queue. Without it imports are processed inside the request (dev/tests). */
  REDIS_URL: optional(z.url({ protocol: /^rediss?$/ })),
  /** "false" on API replicas that should not read imports (run a separate worker container instead) */
  IMPORT_WORKER: z.enum(['true', 'false']).default('true'),
  /** where uploaded files and raw emails are kept (local disk; Azure Blob in production later) */
  STORAGE_DIR: z.string().default('./storage'),
  UPLOAD_MAX_MB: z.coerce.number().positive().max(50).default(10),
  /** With a key, bookings are read by Claude; without one a rule-based reader is used. */
  ANTHROPIC_API_KEY: optional(z.string()),
  ANTHROPIC_MODEL: z.string().default('claude-haiku-5-5'),
  /** Shared secret that signs inbound-email webhooks (HMAC-SHA256). The webhook is off without it. */
  INBOUND_SECRET: z
    .string()
    .min(16, 'must be at least 16 characters')
    .optional(),
  /** comma-separated list of origins allowed to call the API from a browser */
  CORS_ORIGINS: z
    .string()
    .default('http://localhost:5173,https://esrademirturk-nl.github.io'),
});

export type Env = z.infer<typeof envSchema>;

export function validateEnv(raw: Record<string, unknown>): Env {
  const parsed = envSchema.safeParse(raw);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  ${i.path.join('.')}: ${i.message}`)
      .join('\n');
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }
  return parsed.data;
}
