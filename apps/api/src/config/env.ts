import { z } from 'zod';

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
