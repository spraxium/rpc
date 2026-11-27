import type { RpcIdentity } from './rpc-identity.interface';

export interface RpcContext {
  readonly identity: RpcIdentity;
  readonly requestId: string;
  readonly deadline: Date;
  readonly signal: AbortSignal;
}
