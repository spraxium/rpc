import { createServer } from 'node:http';
import { createRpcClient } from '@spraxium/rpc-client';
import type { BotRpcContract } from '@spraxium/rpc-example-shared/bot-rpc-contract';
import { ExampleEnvironment } from '@spraxium/rpc-example-shared/environment';
import { HttpServerLifecycle } from '@spraxium/rpc-example-shared/http-server';
import { GuildStatsEndpoint } from './guild-stats.endpoint.ts';

const host = ExampleEnvironment.host();
const port = ExampleEnvironment.port();
const rpc = createRpcClient<BotRpcContract>(ExampleEnvironment.rpcOptions());
const endpoint = new GuildStatsEndpoint(rpc);
const server = createServer(endpoint.handle.bind(endpoint));

server.listen(port, host);
await new HttpServerLifecycle(server, rpc).ready();
