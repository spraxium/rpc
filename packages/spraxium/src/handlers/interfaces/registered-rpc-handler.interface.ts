import type { RpcContext } from '../../interfaces/rpc-context.interface';
import type { RpcHandlerDescription } from './rpc-handler-description.interface';
import type { RpcHandlerOptions } from './rpc-handler-options.interface';

export interface RegisteredRpcHandler extends RpcHandlerDescription {
  schema?: RpcHandlerOptions['schema'];
  responseSchema?: RpcHandlerOptions['responseSchema'];
  execute(input: unknown, context: RpcContext): unknown;
}
