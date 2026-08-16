// Typed config surface. Read everywhere via ConfigService.get('...').
export default () => ({
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT ?? '3000', 10),
  apiPrefix: process.env.API_PREFIX || 'api/v1',

  mongoUri: process.env.MONGO_URI as string,
  redisUrl: process.env.REDIS_URL || 'redis://127.0.0.1:6379',

  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET as string,
    refreshSecret: process.env.JWT_REFRESH_SECRET as string,
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },

  whatsapp: {
    provider: process.env.WHATSAPP_PROVIDER || 'mock',
    apiUrl: process.env.WHATSAPP_API_URL || '',
    accessToken: process.env.WHATSAPP_ACCESS_TOKEN || '',
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || '',
  },

  enableQueues: (process.env.ENABLE_QUEUES ?? 'true') === 'true',
  tz: process.env.TZ || 'Asia/Kolkata',
  corsOrigins: process.env.CORS_ORIGINS || '*',

  payrollFloorNegativeLeaveDeduction:
    (process.env.PAYROLL_FLOOR_NEGATIVE_LEAVE_DEDUCTION ?? 'false') === 'true',

  seed: {
    adminEmail: process.env.SEED_ADMIN_EMAIL || 'admin@livearts.local',
    adminPassword: process.env.SEED_ADMIN_PASSWORD || 'Admin@12345',
  },
});
