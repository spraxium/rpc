import type { RpcIdentity } from '../../interfaces/rpc-identity.interface';

export interface RpcTokenDigest {
  digest: Buffer;
  identity: RpcIdentity;
}
