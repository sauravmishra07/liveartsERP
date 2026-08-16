import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { json, urlencoded } from 'express';
import { AppModule } from './app.module';

/**
 * Builds the configured Nest application WITHOUT listening.
 *
 * Shared by `main.ts` (long-running server) and `serverless.ts` (Netlify function) so
 * middleware, prefix, validation and Swagger can never drift between the two.
 */
export async function createApp(): Promise<INestApplication> {
  // Own the body parser so we can cap request size (DoS boundary).
  const app = await NestFactory.create(AppModule, { bufferLogs: false, bodyParser: false });
  const config = app.get(ConfigService);

  app.use(json({ limit: '1mb' }));
  app.use(urlencoded({ extended: true, limit: '1mb' }));
  app.use(helmet());
  app.enableCors({
    origin:
      config.get<string>('corsOrigins') === '*'
        ? true
        : config.get<string>('corsOrigins')!.split(',').map((s) => s.trim()),
    credentials: true,
  });

  app.setGlobalPrefix(config.get<string>('apiPrefix') || 'api/v1');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // Swagger at /api/docs (Requirements §37)
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Live Arts ERP API')
    .setDescription('Multi-branch performing-arts academy ERP')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  SwaggerModule.setup('api/docs', app, SwaggerModule.createDocument(app, swaggerConfig));

  return app;
}
