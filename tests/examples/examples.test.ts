import { execFile } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { RpcError } from '@spraxium/rpc-server';
import type { RpcServer } from '@spraxium/rpc-server/runtime';
import { RpcExecutor } from '@spraxium/rpc-server/runtime';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Code } from '../../packages/client/src';
import { RpcHandler } from '../../packages/spraxium/src/handlers/rpc-handler.decorator';
import { RpcRegistry } from '../../packages/spraxium/src/handlers/rpc-handler.registry';
import { RpcRuntimeComposition } from '../../packages/spraxium/src/integration/rpc-runtime.composition';
import { config, token } from '../../packages/spraxium/test/helpers';
import { HttpExampleProcess } from './http-example.process';

const execute = promisify(execFile);
const repository = fileURLToPath(new URL('../../', import.meta.url));
let applications: Record<string, string>;
let plain: RpcServer;
const expected = { members: 42, premium: false, shardId: 0 };

class ExampleHandlers {
  @RpcHandler('guild.stats', { routing: 'guild', permissions: ['guild:read'] })
  stats(input: { guildId: string }): unknown {
    if (input.guildId === '12582912') throw new Error('Private failure details');
    if (input.guildId !== '4194304') throw new RpcError('Guild not found.', Code.NotFound);

    return expected;
  }
}

beforeAll(async () => {
  applications = {};

  for (const name of ['hono', 'nestjs', 'fastify', 'express', 'koa', 'node-http', 'node-client'])
    applications[name] = path.join(repository, 'examples', name);

  const registry = new RpcRegistry();
  registry.scan(new ExampleHandlers());
  const options = config({ rateLimit: { maxRequests: 1000, windowMs: 60000 } });
  plain = RpcRuntimeComposition.createServer(options, new RpcExecutor(registry, options));
  await plain.start();
});

afterAll(async () => {
  await plain?.close();
});

describe('independent HTTP backends', () => {
  it.each(['hono', 'nestjs', 'fastify', 'express', 'koa', 'node-http'])(
    '%s maps success and RPC failures through a real gateway',
    async (name) => {
      if (!plain.address) throw new Error('Missing RPC address.');

      const instance = await HttpExampleProcess.start(applications[name], plain.address, token);

      try {
        const success = await instance.request('4194304');

        expect(success.status).toBe(200);
        expect(await success.json()).toEqual(expected);

        for (const [guildId, status] of [
          ['invalid', 400],
          ['8388608', 404],
          ['12582912', 503],
        ]) {
          const response = await instance.request(String(guildId));

          expect(response.status).toBe(status);
          expect(await response.text()).not.toContain('Private failure details');
        }

        const manifest: { dependencies: Record<string, string> } = JSON.parse(
          await readFile(path.join(applications[name], 'package.json'), 'utf8'),
        );

        expect(manifest.dependencies['discord.js']).toBeUndefined();
        expect(manifest.dependencies['@spraxium/core']).toBeUndefined();
      } finally {
        await instance.stop();
      }
    },
  );
});

describe('standalone clients', () => {
  it.each(['dist/main.js', 'dist/commonjs.cjs'])('runs the Node entry point %s', async (entry) => {
    const result = await execute(process.execPath, [entry, '4194304'], {
      cwd: applications['node-client'],
      env: { ...process.env, SPRAXIUM_RPC_URL: plain.address, SPRAXIUM_RPC_TOKEN: token },
    });

    expect(JSON.parse(result.stdout)).toEqual(expected);
  });
});

it('runs the NestJS gateway and bot client while Nest can still call the bot', async () => {
  if (!plain.address) throw new Error('Missing bot RPC address.');
  const nestToken = 'test-nest-credential-with-more-than-32-characters';
  const nest = await HttpExampleProcess.start(applications.nestjs, plain.address, token, {
    NEST_RPC_HOST: '127.0.0.1',
    NEST_RPC_PORT: '0',
    NEST_RPC_TOKEN: nestToken,
  });

  try {
    expect(await (await nest.request('4194304')).json()).toEqual(expected);
    if (!nest.rpcAddress) throw new Error('NestJS RPC gateway did not start.');

    const result = await execute(
      process.execPath,
      [
        '--input-type=module',
        '-e',
        `
import 'reflect-metadata';
import { TicketsBackendService } from './dist/src/tickets-backend.service.js';

const tickets = new TicketsBackendService();
try {
  const result = await tickets.openTicket('123456789012345678', '234567890123456789');
  console.log(JSON.stringify(result));
} finally {
  await tickets.onShutdown();
}
`,
      ],
      {
        cwd: path.join(repository, 'examples', 'bot'),
        env: { ...process.env, NEST_RPC_URL: nest.rpcAddress, NEST_RPC_TOKEN: nestToken },
      },
    );
    expect(JSON.parse(result.stdout)).toEqual({ ticketId: expect.stringMatching(/^[0-9a-f-]{36}$/) });
  } finally {
    await nest.stop();
  }
});
