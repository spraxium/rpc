import type { RpcContext } from '../interfaces/rpc-context.interface';
import type { RegisteredRpcHandler } from './interfaces/registered-rpc-handler.interface';
import type { RpcHandlerMetadata } from './interfaces/rpc-handler-metadata.interface';
import type { RpcHandlerOptions } from './interfaces/rpc-handler-options.interface';

export class RpcBoundHandler implements RegisteredRpcHandler {
  readonly name: string;
  readonly routing: 'guild' | 'singleton';
  readonly permissions: Array<string>;
  readonly allowAuthenticated: boolean;
  readonly schema?: RpcHandlerOptions['schema'];
  readonly responseSchema?: RpcHandlerOptions['responseSchema'];

  constructor(
    metadata: RpcHandlerMetadata,
    private readonly instance: object,
    private readonly method: unknown,
  ) {
    if (typeof method !== 'function') throw new Error(`RPC ${metadata.name} is not a method.`);
    this.name = metadata.name;
    this.routing = metadata.routing;
    this.permissions = [...(metadata.permissions ?? [])];
    this.allowAuthenticated = metadata.allowAuthenticated === true;
    this.schema = metadata.schema;
    this.responseSchema = metadata.responseSchema;
  }

  execute(input: unknown, context: RpcContext): unknown {
    if (typeof this.method !== 'function') throw new Error(`RPC ${this.name} is not a method.`);
    return this.method.call(this.instance, input, context);
  }
}
