import { RpcSchemaValidator } from '../execution/rpc-schema.validator';
import type { RpcContext } from '../interfaces/rpc-context.interface';
import type { RegisteredRpcMethod } from './interfaces/registered-rpc-method.interface';
import type { RpcMethodOptions } from './interfaces/rpc-method-options.interface';

export class RpcBoundMethod<Input, Output> implements RegisteredRpcMethod {
  readonly permissions: ReadonlyArray<string>;
  readonly allowAuthenticated: boolean;
  readonly responseSchema?: RpcMethodOptions<Input, Output>['responseSchema'];

  constructor(
    readonly name: string,
    private readonly options: RpcMethodOptions<Input, Output>,
  ) {
    this.permissions = [...(options.permissions ?? [])];
    this.allowAuthenticated = options.allowAuthenticated === true;
    this.responseSchema = options.responseSchema;
  }

  prepare(input: unknown): (context: RpcContext) => unknown {
    const parsed = RpcSchemaValidator.parse(this.options.schema, input, false);
    return this.options.handle.bind(this.options, parsed);
  }
}
