import type { ShardingManager } from 'discord.js';
import type { RpcConfigResolver } from '../configuration/rpc-config.resolver';
import { RpcShardDispatcher } from '../sharding/rpc-shard-dispatcher.service';
import type { RpcFrameworkHost } from './interfaces/rpc-framework-host.interface';
import { RpcRuntimeComposition } from './rpc-runtime.composition';

export class RpcParentGateway {
  constructor(
    private readonly host: RpcFrameworkHost,
    private readonly resolver: RpcConfigResolver,
  ) {}

  async start(manager: ShardingManager): Promise<void> {
    const raw = this.host.configuration();
    if (!raw || raw.enabled === false) return;

    this.host.assertCompatible();
    const config = this.resolver.resolve(raw);

    if (typeof manager.totalShards !== 'number') throw new Error('Discord shard count was not resolved.');

    const dispatcher = new RpcShardDispatcher(manager.shards, manager.totalShards, config);
    await dispatcher.start();
    const server = RpcRuntimeComposition.createServer(config, dispatcher);

    try {
      await server.start();
    } catch (error) {
      await server.close();
      throw error;
    }

    this.host.onShutdown(server.close.bind(server));
  }
}
