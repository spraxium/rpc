import type { RpcServer } from '@spraxium/rpc-server/runtime';
import { RpcExecutor } from '@spraxium/rpc-server/runtime';
import { afterEach, describe, expect, it } from 'vitest';
import { Code, createRpcClient } from '../../packages/client/src';
import { RpcHandler } from '../../packages/spraxium/src/handlers/rpc-handler.decorator';
import { RpcRegistry } from '../../packages/spraxium/src/handlers/rpc-handler.registry';
import { RpcRuntimeComposition } from '../../packages/spraxium/src/integration/rpc-runtime.composition';
import { config, token } from '../../packages/spraxium/test/helpers';

let server: RpcServer | undefined;

afterEach(async () => server?.close());

class GuildHandler {
  @RpcHandler('guild.stats', { routing: 'guild', permissions: ['guild:read'] })
  stats(input: { guildId: string }) {
    return { guildId: input.guildId, members: 42 };
  }
}

async function invoke(credential: string) {
  const registry = new RpcRegistry();
  registry.scan(new GuildHandler());
  const options = config();
  server = RpcRuntimeComposition.createServer(options, new RpcExecutor(registry, options));
  await server.start();

  if (!server.address) throw new Error('No gateway address.');

  const client = createRpcClient({ url: server.address, token: credential, protocol: 'grpc' });

  try {
    return await client.call('guild.stats', { guildId: '4194304' });
  } finally {
    client.close();
  }
}

describe('gRPC gateway', () => {
  it('returns a JSON DTO through the gRPC transport', async () => {
    await expect(invoke(token)).resolves.toEqual({ guildId: '4194304', members: 42 });
  });

  it('rejects invalid service credentials', async () => {
    await expect(invoke('invalid-credential')).rejects.toMatchObject({ code: Code.Unauthenticated });
  });
});
