import type { RpcAuthentication } from './rpc-authentication.interface';
import type { RpcRateLimit } from './rpc-rate-limit.interface';
import type { RpcTls } from './rpc-tls.interface';

export interface RpcServerOptions {
  enabled?: boolean;
  host?: string;
  port?: number;
  token?: string;
  permissions?: Array<string>;
  auth?: RpcAuthentication;
  maxPayloadBytes?: number;
  timeoutMs?: number;
  maxConcurrentCalls?: number;
  rateLimit?: RpcRateLimit;
  shutdownGraceMs?: number;
  tls?: RpcTls;
  tlsTerminationProxy?: boolean;
}
