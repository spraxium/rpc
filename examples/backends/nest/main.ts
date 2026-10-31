import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { DashboardModule } from './dashboard.module';

const app = await NestFactory.create(DashboardModule);
app.enableShutdownHooks();
await app.listen(3000, '0.0.0.0');
