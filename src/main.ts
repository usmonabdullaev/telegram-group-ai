import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AppModule } from '@/app.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  await NestFactory.createApplicationContext(AppModule);
  logger.log('Грок bot is running');
}

void bootstrap();
