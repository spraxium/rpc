import { serve } from '@hono/node-server';
import { Code, createRpcClient, RpcClientError } from '@spraxium/rpc-client';
import type { BotRpcContract } from '@spraxium/rpc-example-shared/bot-rpc-contract';
import { ExampleEnvironment } from '@spraxium/rpc-example-shared/environment';
import { HttpServerLifecycle } from '@spraxium/rpc-example-shared/http-server';
import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { createGuildRoutes } from './guilds.routes.ts';

const hostname = ExampleEnvironment.host();
const port = ExampleEnvironment.port();
const rpc = createRpcClient<BotRpcContract>(ExampleEnvironment.rpcOptions());
const app = new Hono();

app.route('/guilds', createGuildRoutes(rpc));
app.onError((error, context) => {
  if (error instanceof HTTPException) return error.getResponse();
  if (!(error instanceof RpcClientError)) return context.json({ error: 'Internal server error' }, 500);
  if (error.code === Code.InvalidArgument) return context.json({ error: 'Invalid guild ID' }, 400);
  if (error.code === Code.NotFound) return context.json({ error: 'Guild not found' }, 404);
  return context.json({ error: 'Bot unavailable' }, 503);
});

const server = serve({ fetch: app.fetch, hostname, port });
await new HttpServerLifecycle(server, rpc).ready();
