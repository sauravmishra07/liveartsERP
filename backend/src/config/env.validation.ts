import * as Joi from 'joi';

// Fail fast at boot if the environment is misconfigured (Requirements §3).
export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'test', 'production')
    .default('development'),
  PORT: Joi.number().default(3000),
  API_PREFIX: Joi.string().default('api/v1'),

  MONGO_URI: Joi.string().uri({ scheme: ['mongodb', 'mongodb+srv'] }).required(),
  REDIS_URL: Joi.string().default('redis://127.0.0.1:6379'),

  JWT_ACCESS_SECRET: Joi.string().min(16).required(),
  JWT_REFRESH_SECRET: Joi.string().min(16).required(),
  JWT_ACCESS_EXPIRES_IN: Joi.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: Joi.string().default('7d'),

  WHATSAPP_PROVIDER: Joi.string().valid('mock', 'meta').default('mock'),
  WHATSAPP_API_URL: Joi.string().allow('').default(''),
  WHATSAPP_ACCESS_TOKEN: Joi.string().allow('').default(''),
  WHATSAPP_PHONE_NUMBER_ID: Joi.string().allow('').default(''),

  ENABLE_QUEUES: Joi.boolean().truthy('true').falsy('false').default(true),

  TZ: Joi.string().default('Asia/Kolkata'),
  CORS_ORIGINS: Joi.string().default('*'),

  PAYROLL_FLOOR_NEGATIVE_LEAVE_DEDUCTION: Joi.boolean()
    .truthy('true')
    .falsy('false')
    .default(false),

  // tlds:false so dev addresses like admin@livearts.local are accepted.
  SEED_ADMIN_EMAIL: Joi.string()
    .email({ tlds: { allow: false } })
    .default('admin@livearts.local'),
  SEED_ADMIN_PASSWORD: Joi.string().default('Admin@12345'),
});
