import { logger } from '@spraxium/logger';
import type { ResolvedRpcConfig } from '../configuration/interfaces/resolved-rpc-config.interface';
import type { RpcDispatcher } from '../execution/interfaces/rpc-dispatcher.interface';
import { RpcCredentialRateLimiter } from '../security/rpc-credential-rate.limiter';
import { RpcTokenAuthenticator } from '../security/rpc-token.authenticator';
import { RpcServer } from '../transport/rpc.server';

export class RpcRuntimeComposition {
  static createServer(config: ResolvedRpcConfig, dispatcher: RpcDispatcher): RpcServer {
    return new RpcServer(
      config,
      dispatcher,
      new RpcTokenAuthenticator(config),
      new RpcCredentialRateLimiter(config),
      logger.child('RpcServer'),
    );
  }
}
