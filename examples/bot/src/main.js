import 'reflect-metadata';
import { SpraxiumFactory } from '@spraxium/core';
import { ExampleEnvironment } from '../../shared/environment.service.js';
import { AppModule } from './app.module.js';

const app = await SpraxiumFactory.create({ token: ExampleEnvironment.required('DISCORD_TOKEN') });
app.useModule(AppModule);
if (process.env.RPC_SHARDING === 'true') app.useSharding({ totalShards: 'auto' });
await app.listen();
