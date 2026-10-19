import 'reflect-metadata';
import { Module } from '@spraxium/common';
import { ConfigStore, ModuleLoader } from '@spraxium/core';
import { RpcHandler, RpcModule, defineRpc } from '@spraxium/rpc';
import { Client } from 'discord.js';

class GuildService {
  stats() {
    return { members: 42, shardId: Number(process.env.SHARDS ?? 0), pid: process.pid };
  }
}

class GuildHandler {
  constructor(guilds) {
    this.guilds = guilds;
  }

  stats() {
    return this.guilds.stats();
  }
}

Reflect.defineMetadata('design:paramtypes', [GuildService], GuildHandler);
RpcHandler('guild.stats', { routing: 'guild', permissions: ['guild:read'] })(
  GuildHandler.prototype,
  'stats',
  Object.getOwnPropertyDescriptor(GuildHandler.prototype, 'stats'),
);

class FeatureModule {}

Module({ providers: [GuildService], exports: [GuildService] })(FeatureModule);

class SharedModule {}

Module({ imports: [RpcModule] })(SharedModule);

class AppModule {}

Module({ imports: [FeatureModule, RpcModule, SharedModule], providers: [GuildHandler] })(AppModule);
ConfigStore.load({
  plugins: [
    defineRpc({
      port: 0,
      token: 'test-credential-with-more-than-32-characters',
      permissions: ['guild:read'],
    }),
  ],
});
const client = new Client({ intents: [] });
const loader = new ModuleLoader();
loader.load(AppModule, client);
await loader.runBootHooks();
await loader.runReadyHooks(client);
process.send?.({ kind: 'test-ready' });
process.on('message', async (message) => {
  if (message?.kind !== 'test-stop') return;
  await loader.runShutdownHooks();
  await client.destroy();
  process.disconnect();
});
