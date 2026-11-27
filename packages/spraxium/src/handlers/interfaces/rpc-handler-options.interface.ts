import type { RpcArgumentSchema } from '@spraxium/rpc-server';

export interface RpcHandlerOptions {
  routing: 'guild' | 'singleton';
  permissions?: Array<string>;
  allowAuthenticated?: boolean;
  schema?: RpcArgumentSchema;
  responseSchema?: RpcArgumentSchema;
}
