import type { RpcContext } from '../../interfaces/rpc-context.interface';

export interface RpcDispatcher<Description extends { name: string } = { name: string }> {
  descriptions(): Array<Description>;
  invoke(method: string, payload: Uint8Array, context: RpcContext): Promise<Uint8Array>;
  close(graceMs: number): Promise<void>;
}
