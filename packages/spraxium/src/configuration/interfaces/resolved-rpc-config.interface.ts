import type { RpcAuthentication } from './rpc-authentication.interface';
import type { RpcConfig } from './rpc-config.interface';

export interface ResolvedRpcConfig
  extends Required<Omit<RpcConfig, 'tls' | 'token' | 'permissions' | 'auth'>> {
  auth: RpcAuthentication;
  tls?: RpcConfig['tls'];
}
