import { logger } from '@spraxium/logger';
import { type RpcDispatcher, type RpcServer, RpcServerRuntime } from '@spraxium/rpc-server/runtime';
import type { ResolvedRpcConfig } from '../configuration/interfaces/resolved-rpc-config.interface';

export class RpcRuntimeComposition {
  static createServer(config: ResolvedRpcConfig, dispatcher: RpcDispatcher): RpcServer {
    return RpcServerRuntime.create(config, dispatcher, logger.child('RpcServer'));
  }
}
