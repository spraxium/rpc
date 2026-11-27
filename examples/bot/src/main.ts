import 'reflect-metadata';
import { SpraxiumFactory } from '@spraxium/core';
import { ExampleEnvironment } from '@spraxium/rpc-example-shared/environment';
import { AppModule } from './app.module.ts';

const app = await SpraxiumFactory.create({ token: ExampleEnvironment.required('DISCORD_TOKEN') });

app.useModule(AppModule);

if (process.env.RPC_SHARDING === 'true') app.useSharding({ totalShards: 'auto' });

await app.listen();
