import process from 'node:process';
import { z } from 'zod/v4';

const zodConfigObject = {
  BETTER_AUTH_SECRET: z.string(),
  BETTER_AUTH_URL: z.string().optional(),
  DATABASE_URL: z.string(),
  NODE_ENV: z.string().default('test'),
  OLLAMA_HOST: z.string().default('http://localhost:11434'),
  API_PORT: z
    .string()
    .default('3000')
    .transform((v) => Number.parseInt(v, 10)),
  SOCIAL_LOGIN_ENABLED: z.boolean().default(false),
  TRUSTED_ORIGINS: z.string().default('*'),
};

const configSchema = z.object(zodConfigObject);

const parsedConfig = configSchema.parse(process.env);

const appConfig = {
  ...parsedConfig,
  BETTER_AUTH_URL:
    parsedConfig.BETTER_AUTH_URL ??
    `http://localhost:${parsedConfig.API_PORT}/api/auth`,
  TRUSTED_ORIGINS: parsedConfig.TRUSTED_ORIGINS.includes(',')
    ? parsedConfig.TRUSTED_ORIGINS.split(',').map((origin) => origin.trim())
    : [parsedConfig.TRUSTED_ORIGINS],
  IS_DEV: ['test', 'development', 'staging', 'qa'].includes(
    parsedConfig.NODE_ENV.toLowerCase(),
  ),
};

type Config = typeof appConfig;

export const config: Config = appConfig;
