import { execFile } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { afterEach, describe, expect, it } from 'vitest';
import { RpcExecutor } from '../../packages/spraxium/src/execution/rpc.executor';
import { RpcHandler } from '../../packages/spraxium/src/handlers/rpc-handler.decorator';
import { RpcRegistry } from '../../packages/spraxium/src/handlers/rpc-handler.registry';
import { RpcRuntimeComposition } from '../../packages/spraxium/src/integration/rpc-runtime.composition';
import type { RpcServer } from '../../packages/spraxium/src/transport/rpc.server';
import { config, token } from '../../packages/spraxium/test/helpers';

const execute = promisify(execFile);
const jar = fileURLToPath(new URL('../../examples/java-client/target/rpc-java-client.jar', import.meta.url));
let server: RpcServer | undefined;
afterEach(async () => server?.close());

async function invoke(credential: string) {
  class Handlers {
    @RpcHandler('guild.stats', { routing: 'guild', permissions: ['guild:read'] })
    stats(input: {
      guildId: string;
    }) {
      return { guildId: input.guildId, members: 42 };
    }
  }
  const registry = new RpcRegistry();
  registry.scan(new Handlers());
  const options = config();
  server = RpcRuntimeComposition.createServer(options, new RpcExecutor(registry, options));
  await server.start();
  if (!server.address) throw new Error('Listener did not start.');
  const address = new URL(server.address);
  return execute(
    'java',
    ['-jar', jar, address.hostname, address.port, 'guild.stats', '{"guildId":"4194304"}', '--insecure-local'],
    {
      env: { ...process.env, SPRAXIUM_RPC_TOKEN: credential },
    },
  );
}

describe('Java gRPC → Node RPC server', () => {
  it('uses generated Java bindings and the real HTTP/2 gateway', async () => {
    const result = await invoke(token);
    expect(JSON.parse(result.stdout)).toEqual({ guildId: '4194304', members: 42 });
  });

  it('receives the standard gRPC authentication status', async () => {
    await expect(invoke('invalid-credential')).rejects.toMatchObject({
      code: 1,
      stderr: expect.stringContaining('UNAUTHENTICATED'),
    });
  });
});
