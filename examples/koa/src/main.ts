import { createRpcClient } from '@spraxium/rpc-client';
import type { BotRpcContract } from '@spraxium/rpc-example-shared/bot-rpc-contract';
import { ExampleEnvironment } from '@spraxium/rpc-example-shared/environment';
import { HttpServerLifecycle } from '@spraxium/rpc-example-shared/http-server';
import Koa from 'koa';
import { createGuildRouter } from './guilds.router.ts';
import { rpcErrorMiddleware } from './rpc-error.middleware.ts';

const host = ExampleEnvironment.host();
const port = ExampleEnvironment.port();
const rpc = createRpcClient<BotRpcContract>(ExampleEnvironment.rpcOptions());
const app = new Koa();
const guilds = createGuildRouter(rpc);

app.use(rpcErrorMiddleware);
app.use(guilds.routes());
app.use(guilds.allowedMethods());

const server = app.listen(port, host);
await new HttpServerLifecycle(server, rpc).ready();
