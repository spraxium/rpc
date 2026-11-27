import { Code, createRpcClient, RpcClientError } from '@spraxium/rpc-client';
import type { BotRpcContract } from '@spraxium/rpc-example-shared/bot-rpc-contract';
import { ExampleEnvironment } from '@spraxium/rpc-example-shared/environment';
import Fastify from 'fastify';
import { guildRoutes } from './guilds.routes.ts';

const host = ExampleEnvironment.host();
const port = ExampleEnvironment.port();
const rpc = createRpcClient<BotRpcContract>(ExampleEnvironment.rpcOptions());
const app = Fastify({ logger: true });

app.register(guildRoutes, { prefix: '/guilds', rpc });
app.setErrorHandler((error, request, reply) => {
  if (error instanceof Error && 'validation' in error && error.validation) {
    return reply.code(400).send({ error: 'Invalid guild ID' });
  }

  if (!(error instanceof RpcClientError)) {
    request.log.error(error);
    return reply.code(500).send({ error: 'Internal server error' });
  }

  if (error.code === Code.InvalidArgument) return reply.code(400).send({ error: 'Invalid guild ID' });
  if (error.code === Code.NotFound) return reply.code(404).send({ error: 'Guild not found' });

  return reply.code(503).send({ error: 'Bot unavailable' });
});
app.addHook('onClose', async () => rpc.close());

try {
  await app.listen({ host, port });
} catch (error) {
  await app.close();
  throw error;
}

let stopping = false;

function stop() {
  if (stopping) return;

  stopping = true;
  void app.close().catch((error) => {
    app.log.error(error);
    process.exitCode = 1;
  });
}

process.once('SIGINT', stop);
process.once('SIGTERM', stop);
