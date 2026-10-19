import { Injectable } from '@spraxium/common';
import { ConfigStore, ParentHookRegistry, isShardChild } from '@spraxium/core';
import type { ShardingManager } from 'discord.js';
import { defineRpc } from '../configuration/rpc.config';
import type { RpcFrameworkHost } from './interfaces/rpc-framework-host.interface';

@Injectable()
export class SpraxiumRpcHost implements RpcFrameworkHost {
  configuration() {
    return ConfigStore.getPluginConfig(defineRpc);
  }

  isShardChild(): boolean {
    return isShardChild();
  }

  assertCompatible(): void {
    this.shutdownRegistrar();
  }

  registerParent(hook: (manager: ShardingManager) => Promise<void>): void {
    ParentHookRegistry.register(hook);
  }

  onShutdown(hook: () => Promise<void>): void {
    this.shutdownRegistrar()(hook);
  }

  private shutdownRegistrar(): (hook: () => Promise<void>) => unknown {
    if (!('onShutdown' in ParentHookRegistry) || typeof ParentHookRegistry.onShutdown !== 'function') {
      throw new Error(
        'Spraxium RPC requires a framework release with module integrations, onApplicationReady and parent shutdown hooks. See docs/framework-compatibility.md in the RPC repository.',
      );
    }
    return ParentHookRegistry.onShutdown.bind(ParentHookRegistry);
  }
}
