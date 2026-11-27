import type { RpcIdentity } from '../../interfaces/rpc-identity.interface';

export interface RpcAuthenticator {
  authenticate(header: string | null): RpcIdentity;
}
