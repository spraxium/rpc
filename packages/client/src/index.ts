import type { RpcMethodContract } from '@spraxium/rpc-protocol';
import { RpcClientConfigResolver } from './configuration/rpc-client-config.resolver';
import type { RpcClientOptions } from './interfaces/rpc-client-options.interface';
import type { RpcClient } from './interfaces/rpc-client.interface';
import { NodeRpcClient } from './rpc.client';
import { ConnectRpcConnection } from './transport/connect-rpc.connection';

export { Code, ConnectError as RpcClientError } from '@connectrpc/connect';
export type { RpcMethodContract } from '@spraxium/rpc-protocol';
export type { RpcCallOptions } from './interfaces/rpc-call-options.interface';
export type { RpcClientOptions } from './interfaces/rpc-client-options.interface';
export type { RpcClient } from './interfaces/rpc-client.interface';

/**
 * Creates a reusable client for calling RPC handlers over Connect or gRPC.
 *
 * @typeParam Contract - Maps method names to their input and output types.
 * @param options - Server URL, service token, transport settings and request limits.
 * @returns A typed client. Call `close()` on shutdown to abort pending calls and release connections.
 * @throws {Error} If the URL, token, transport settings or request limits are invalid.
 *
 * @example
 * ```ts
 * const rpc = createRpcClient({
 *   url: 'http://127.0.0.1:4300',
 *   token: process.env.SPRAXIUM_RPC_TOKEN ?? '',
 * });
 *
 * try {
 *   await rpc.call('guild.stats', { guildId: '123456789012345678' });
 * } finally {
 *   rpc.close();
 * }
 * ```
 */
export function createRpcClient<
  Contract extends {
    [Method in keyof Contract]: RpcMethodContract;
  } = Record<string, RpcMethodContract>,
>(options: RpcClientOptions): RpcClient<Contract> {
  const config = new RpcClientConfigResolver().resolve(options);
  return new NodeRpcClient<Contract>(config, new ConnectRpcConnection(config));
}
