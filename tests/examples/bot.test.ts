import { execFile } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { expect, it } from 'vitest';

it('resolves JavaScript bot providers through native dependency injection', async () => {
  const result = await promisify(execFile)(
    process.execPath,
    [
      '--input-type=module',
      '-e',
      `
import 'reflect-metadata';
import assert from 'node:assert/strict';
import { Module } from '@spraxium/common';
import { ModuleLoader } from '@spraxium/core';
import { Client } from 'discord.js';
import { GuildModule } from './src/guild.module.js';
import { GuildRpcService } from './src/guild-rpc.service.js';
class TestModule {}
Module({ imports: [GuildModule], providers: [GuildRpcService], exports: [GuildRpcService] })(TestModule);
const client = new Client({ intents: [] });
client.guilds.cache.set('4194304', { memberCount: 42, premiumTier: 0, shardId: 0 });
const loader = new ModuleLoader();
loader.load(TestModule, client);
const handler = loader.getContainer().get(GuildRpcService);
assert.deepEqual(handler.stats({ guildId: '4194304' }), { members: 42, premium: false, shardId: 0 });
await client.destroy();
console.log('JavaScript providers verified.');
`,
    ],
    { cwd: fileURLToPath(new URL('../../examples/bot/', import.meta.url)) },
  );
  expect(result.stdout).toContain('JavaScript providers verified.');
});
