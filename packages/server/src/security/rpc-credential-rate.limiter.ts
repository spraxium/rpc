import { Code, ConnectError } from '@connectrpc/connect';
import type { ResolvedRpcServerConfig } from '../configuration/interfaces/resolved-rpc-server-config.interface';
import type { RpcIdentity } from '../interfaces/rpc-identity.interface';
import type { RpcRateLimiter } from './interfaces/rpc-rate-limiter.interface';
import type { RpcRateWindow } from './interfaces/rpc-rate-window.interface';

export class RpcCredentialRateLimiter implements RpcRateLimiter {
  private readonly windows = new Map<string, RpcRateWindow>();

  constructor(private readonly config: ResolvedRpcServerConfig) {}

  check(identity: RpcIdentity): void {
    const now = Date.now();
    let window = this.windows.get(identity.id);

    if (!window || now - window.start >= this.config.rateLimit.windowMs) {
      window = { start: now, count: 0 };
      this.windows.set(identity.id, window);
    }

    if (window.count >= this.config.rateLimit.maxRequests)
      throw new ConnectError('RPC rate limit exceeded.', Code.ResourceExhausted);

    window.count++;
  }
}
