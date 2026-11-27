import type { RpcContext } from '@spraxium/rpc-server';
import type { RegisteredRpcMethod } from '@spraxium/rpc-server/runtime';
import type { RpcHandlerDescription } from './rpc-handler-description.interface';
import type { RpcHandlerOptions } from './rpc-handler-options.interface';

export interface RegisteredRpcHandler
  extends RpcHandlerDescription,
    Omit<RegisteredRpcMethod, keyof RpcHandlerDescription> {
  schema?: RpcHandlerOptions['schema'];
  responseSchema?: RpcHandlerOptions['responseSchema'];
  execute(input: unknown, context: RpcContext): unknown;
}
