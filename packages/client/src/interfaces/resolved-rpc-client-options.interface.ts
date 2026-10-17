import type { RpcClientOptions } from './rpc-client-options.interface';
export interface ResolvedRpcClientOptions extends RpcClientOptions {
  timeoutMs: number;
  maxPayloadBytes: number;
}
