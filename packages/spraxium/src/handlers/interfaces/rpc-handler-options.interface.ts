import type { RpcArgumentSchema } from './rpc-argument-schema.interface';

export interface RpcHandlerOptions {
  routing: 'guild' | 'singleton';
  permissions?: Array<string>;
  allowAuthenticated?: boolean;
  schema?: RpcArgumentSchema;
  responseSchema?: RpcArgumentSchema;
}
