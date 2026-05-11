import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.enableCors({
    origin: [
      'http://localhost:5173',
      'http://localhost:5174',
      'https://enrec.com.ar',
      'https://www.enrec.com.ar',
    ],
    methods: ['GET', 'POST', 'OPTIONS'],
  });

  const port = process.env.PORT ?? 3001;
  await app.listen(port);
  console.log(`🎙️  EN .REC backend corriendo en http://localhost:${port}`);
}

bootstrap();
