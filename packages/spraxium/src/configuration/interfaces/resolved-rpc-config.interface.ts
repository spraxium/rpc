import type { ResolvedRpcServerConfig } from '@spraxium/rpc-server/runtime';

export interface ResolvedRpcConfig extends ResolvedRpcServerConfig {
  singletonShard: number;
}
