import type { RpcMethodContract } from '@spraxium/rpc-protocol';
import type { RpcServerOptions } from './configuration/interfaces/rpc-server-options.interface';
import { RpcGateway } from './rpc.gateway';
import type { RpcLogger } from './transport/interfaces/rpc-logger.interface';

export { Code } from '@connectrpc/connect';
export type { RpcMethodContract } from '@spraxium/rpc-protocol';
export type { RpcServerOptions } from './configuration/interfaces/rpc-server-options.interface';
export { RpcError } from './execution/rpc.error';
export type { RpcArgumentSchema } from './handlers/interfaces/rpc-argument-schema.interface';
export type { RpcMethodOptions } from './handlers/interfaces/rpc-method-options.interface';
export type { RpcContext } from './interfaces/rpc-context.interface';
export type { RpcIdentity } from './interfaces/rpc-identity.interface';
export type { RpcGateway } from './rpc.gateway';
export type { RpcLogger } from './transport/interfaces/rpc-logger.interface';

/**
 * Creates an authenticated gateway for the v1 Spraxium RPC protocol.
 * Register methods before starting it and close it with the host application.
 */
export function createRpcServer<
  Contract extends { [Method in keyof Contract]: RpcMethodContract } = Record<string, RpcMethodContract>,
>(options: RpcServerOptions & { logger?: RpcLogger }): RpcGateway<Contract> {
  const { logger = console, ...config } = options;
  return new RpcGateway<Contract>(config, logger);
}
