import { createHash, timingSafeEqual } from 'node:crypto';
import { Code, ConnectError } from '@connectrpc/connect';
import type { ResolvedRpcConfig } from '../configuration/interfaces/resolved-rpc-config.interface';
import type { RpcIdentity } from '../interfaces/rpc-identity.interface';
import type { RpcAuthenticator } from './interfaces/rpc-authenticator.interface';
import type { RpcTokenDigest } from './interfaces/rpc-token-digest.interface';

export class RpcTokenAuthenticator implements RpcAuthenticator {
  private readonly credentials: Array<RpcTokenDigest> = [];

  constructor(config: ResolvedRpcConfig) {
    for (const token of config.auth.tokens) {
      this.credentials.push({
        digest: createHash('sha256').update(token.value).digest(),
        identity: Object.freeze({ id: token.id, permissions: Object.freeze([...token.permissions]) }),
      });
    }
  }

  authenticate(header: string | null): RpcIdentity {
    if (!header?.startsWith('Bearer ') || header.length > 8192)
      throw new ConnectError('Authentication required.', Code.Unauthenticated);
    const digest = createHash('sha256').update(header.slice(7)).digest();
    let identity: RpcIdentity | undefined;
    for (const credential of this.credentials) {
      if (timingSafeEqual(digest, credential.digest)) identity = credential.identity;
    }
    if (!identity) throw new ConnectError('Authentication required.', Code.Unauthenticated);
    return identity;
  }
}
