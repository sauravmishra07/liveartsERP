import { ConfigService } from '@nestjs/config';
import { createApp } from './app.factory';

async function bootstrap() {
  const app = await createApp();
  const config = app.get(ConfigService);

  const prefix = config.get<string>('apiPrefix') || 'api/v1';
  const port = config.get<number>('port') || 3000;
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`🚀 API on http://localhost:${port}/${prefix}  |  docs: /api/docs`);
}
bootstrap();
