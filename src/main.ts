import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as dotenv from 'dotenv';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';

// Carrega as variáveis de ambiente antes de tudo
dotenv.config();


async function bootstrap() {
  // Pega os níveis de log do .env (ex: 'log,error,warn,debug')
  const levelsEnv = process.env.LEVELS_LOG;
  let loggerLevels: any = undefined;
  if (levelsEnv) {
    loggerLevels = levelsEnv.split(',').map(l => l.trim());
  }
  const app = await NestFactory.create(AppModule, {
    abortOnError: false,
    logger: loggerLevels || undefined,
  });

  app.useGlobalPipes(new ValidationPipe({
    transform: true,
    whitelist: true,
  }));

  const config = new DocumentBuilder()
    .setTitle('Finance API')
    .setDescription('The Finance API for managing expenses, receipts, and more')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  await app.listen(3001);
}

bootstrap();
