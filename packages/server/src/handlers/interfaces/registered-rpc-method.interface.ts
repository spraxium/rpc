import type { RpcContext } from '../../interfaces/rpc-context.interface';
import type { RpcArgumentSchema } from './rpc-argument-schema.interface';

export interface RegisteredRpcMethod {
  name: string;
  permissions: ReadonlyArray<string>;
  allowAuthenticated: boolean;
  responseSchema?: RpcArgumentSchema;
  validateInput?(input: unknown): void;
  prepare(input: unknown): (context: RpcContext) => unknown;
}
