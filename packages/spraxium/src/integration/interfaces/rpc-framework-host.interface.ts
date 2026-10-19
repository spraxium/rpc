import type { ShardingManager } from 'discord.js';
import type { RpcConfig } from '../../configuration/interfaces/rpc-config.interface';

export interface RpcFrameworkHost {
  configuration(): RpcConfig | undefined;
  isShardChild(): boolean;
  assertCompatible(): void;
  registerParent(hook: (manager: ShardingManager) => Promise<void>): void;
  onShutdown(hook: () => Promise<void>): void;
}
