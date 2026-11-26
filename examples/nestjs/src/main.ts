import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ExampleEnvironment } from '@spraxium/rpc-example-shared/environment';
import { AppModule } from './app.module.ts';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  app.enableShutdownHooks();
  await app.listen(ExampleEnvironment.port(), ExampleEnvironment.host());
}

await bootstrap();
