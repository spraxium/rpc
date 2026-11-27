import type { RpcIdentity } from '../../interfaces/rpc-identity.interface';

export interface RpcRateLimiter {
  check(identity: RpcIdentity): void;
}
