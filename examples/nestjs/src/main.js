import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ExampleEnvironment } from '../../shared/environment.service.js';
import { DashboardModule } from './dashboard.module.js';

const app = await NestFactory.create(DashboardModule);
app.enableShutdownHooks();
await app.listen(ExampleEnvironment.port(), ExampleEnvironment.host());
