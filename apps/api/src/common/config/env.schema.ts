import { z } from 'zod';

export const envSchema = z.object({
  DATABASE_URL: z.string().regex(/^postgres(ql)?:\/\//, 'must be a PostgreSQL connection string'),
  PORT: z.coerce.number().int().positive().default(4000),
  WEB_ORIGIN: z.string().default('http://localhost:3000'),
  JWT_SECRET: z.string().min(16, 'must be at least 16 characters'),
  JWT_EXPIRES_IN_S: z.coerce
    .number()
    .int()
    .positive()
    .default(8 * 3600),
  OPERATOR_EMAIL: z.string().email().optional(),
  OPERATOR_PASSWORD: z.string().min(8).optional(),
});

export type AppConfig = z.infer<typeof envSchema>;

export function parseEnvConfig(env: NodeJS.ProcessEnv): AppConfig {
  const result = envSchema.safeParse(env);
  if (!result.success) {
    const issues = result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
    throw new Error(`Invalid environment configuration (${issues}). See .env.example.`);
  }
  return result.data;
}
