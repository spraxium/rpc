import type { RpcServerOptions } from '@spraxium/rpc-server';

export interface RpcConfig extends RpcServerOptions {
  singletonShard?: number;
}
