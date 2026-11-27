import type { RpcCredential } from './rpc-credential.interface';

export interface RpcAuthentication {
  tokens: Array<RpcCredential>;
}
