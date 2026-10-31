import 'reflect-metadata';
import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { APP_CONFIG, type AppConfig } from './common/config/app-config.module';
import { loadRootEnv } from './common/config/load-env';
import { setupSwagger } from './swagger';

async function bootstrap(): Promise<void> {
  loadRootEnv(__dirname);
  const app = await NestFactory.create(AppModule);
  const config = app.get<AppConfig>(APP_CONFIG);

  app.setGlobalPrefix('api');
  app.enableCors({ origin: config.WEB_ORIGIN.split(',').map((o) => o.trim()) });
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
  );
  app.enableShutdownHooks();
  setupSwagger(app);

  await app.listen(config.PORT);
  Logger.log(`API on http://localhost:${config.PORT}/api · Swagger: /api/docs`, 'Bootstrap');
}

void bootstrap();
