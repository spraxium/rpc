import type { ResolvedRpcServerConfig } from '../configuration/interfaces/resolved-rpc-server-config.interface';
import type { RpcDispatcher } from '../execution/interfaces/rpc-dispatcher.interface';
import { RpcCredentialRateLimiter } from '../security/rpc-credential-rate.limiter';
import { RpcTokenAuthenticator } from '../security/rpc-token.authenticator';
import type { RpcLogger } from './interfaces/rpc-logger.interface';
import { RpcServer } from './rpc.server';

export class RpcServerRuntime {
  static create(config: ResolvedRpcServerConfig, dispatcher: RpcDispatcher, logger: RpcLogger): RpcServer {
    return new RpcServer(
      config,
      dispatcher,
      new RpcTokenAuthenticator(config),
      new RpcCredentialRateLimiter(config),
      logger,
    );
  }
}
