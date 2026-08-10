import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const application = await NestFactory.create(AppModule);
  application.setGlobalPrefix('api');
  await application.listen(3000);
}

void bootstrap();
