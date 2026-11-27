import { execFile } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { expect, it } from 'vitest';

it('loads the TypeScript bot configuration and resolves providers', async () => {
  const result = await promisify(execFile)(
    process.execPath,
    [
      '--input-type=module',
      '-e',
      `
import 'reflect-metadata';
import assert from 'node:assert/strict';
import { ConfigLoader, ConfigStore, ModuleLoader } from '@spraxium/core';
import { defineRpc } from '@spraxium/rpc';
import { Client } from 'discord.js';
import { GuildModule } from './dist/src/guild.module.js';
import { GuildRpcService } from './dist/src/guild-rpc.service.js';

process.env.SPRAXIUM_RPC_TOKEN = 'test-credential-with-more-than-32-characters';
delete process.env.SPRAXIUM_RPC_TLS_KEY;
delete process.env.SPRAXIUM_RPC_TLS_CERT;
for (const mode of ['development', 'production']) {
  process.env.NODE_ENV = mode;
  await ConfigLoader.load();
  const config = ConfigStore.getPluginConfig(defineRpc);
  assert.equal(config?.token, process.env.SPRAXIUM_RPC_TOKEN);
  assert.deepEqual(config?.permissions, ['guild:read']);
}

const client = new Client({ intents: [] });
client.guilds.cache.set('4194304', { memberCount: 42, premiumTier: 0, shardId: 0 });
const loader = new ModuleLoader();
loader.load(GuildModule, client);
const handler = loader.getContainer().get(GuildRpcService);
assert.deepEqual(handler.stats({ guildId: '4194304' }), { members: 42, premium: false, shardId: 0 });
await client.destroy();
console.log('Bot providers verified.');
`,
    ],
    { cwd: fileURLToPath(new URL('../../examples/bot/', import.meta.url)) },
  );

  expect(result.stdout).toContain('Bot providers verified.');
});
