import type { RpcMethodContract } from '@spraxium/rpc-protocol';
import { RpcClientConfigResolver } from './configuration/rpc-client-config.resolver';
import type { RpcClient } from './interfaces/rpc-client.interface';
import type { RpcClientOptions } from './interfaces/rpc-client-options.interface';
import { NodeRpcClient } from './rpc.client';
import { ConnectRpcConnection } from './transport/connect-rpc.connection';

export { Code, ConnectError as RpcClientError } from '@connectrpc/connect';
export type { RpcMethodContract } from '@spraxium/rpc-protocol';
export type { RpcCallOptions } from './interfaces/rpc-call-options.interface';
export type { RpcClient } from './interfaces/rpc-client.interface';
export type { RpcClientOptions } from './interfaces/rpc-client-options.interface';

/**
 * Creates a Node.js client for a Spraxium RPC gateway. Reuse it across calls.
 * @param options Gateway URL, service credential and optional transport settings.
 * @throws Error if the URL, credential or transport options are invalid.
 */
export function createRpcClient<
  Contract extends {
    [Method in keyof Contract]: RpcMethodContract;
  } = Record<string, RpcMethodContract>,
>(options: RpcClientOptions): RpcClient<Contract> {
  const config = new RpcClientConfigResolver().resolve(options);
  return new NodeRpcClient<Contract>(config, new ConnectRpcConnection(config));
}
