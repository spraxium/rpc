import type { RpcHandlerDescription } from '../../handlers/interfaces/rpc-handler-description.interface';
import type { RpcContext } from '../../interfaces/rpc-context.interface';

export interface RpcDispatcher {
  descriptions(): Array<RpcHandlerDescription>;
  invoke(method: string, payload: Uint8Array, context: RpcContext): Promise<Uint8Array>;
  close(graceMs: number): Promise<void>;
}
