import type { RpcAuthentication } from './rpc-authentication.interface';
import type { RpcServerOptions } from './rpc-server-options.interface';

export interface ResolvedRpcServerConfig
  extends Required<Omit<RpcServerOptions, 'tls' | 'token' | 'permissions' | 'auth'>> {
  auth: RpcAuthentication;
  tls?: RpcServerOptions['tls'];
}
