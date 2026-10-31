import { SpraxiumFactory } from '@spraxium/core';
import { ExampleEnvironment } from '../environment.service';
import { AppModule } from './app.module';

const app = await SpraxiumFactory.create({ token: ExampleEnvironment.required('DISCORD_TOKEN') });
app.useModule(AppModule);
if (process.env.RPC_SHARDING === 'true') app.useSharding({ totalShards: 'auto' });
await app.listen();
