import { Injectable } from '@spraxium/common';
import { RpcServerConfigResolver } from '@spraxium/rpc-server/runtime';
import type { ResolvedRpcConfig } from './interfaces/resolved-rpc-config.interface';
import type { RpcConfig } from './interfaces/rpc-config.interface';

@Injectable()
export class RpcConfigResolver {
  private readonly server = new RpcServerConfigResolver();

  resolve(config: RpcConfig): ResolvedRpcConfig {
    const resolved = this.server.resolve(config);
    const { singletonShard = 0 } = config;
    if (!Number.isSafeInteger(singletonShard) || singletonShard < 0) {
      throw new Error('RPC singletonShard must be a nonnegative integer.');
    }

    return { ...resolved, singletonShard };
  }
}
