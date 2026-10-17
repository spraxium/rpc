import type { RpcCallOptions } from './rpc-call-options.interface';

export interface RpcGatewayConnection {
  invoke(method: string, payload: Uint8Array, options: RpcCallOptions): Promise<Uint8Array>;
  close(): void;
}
