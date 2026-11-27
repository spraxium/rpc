import { Code, ConnectError } from '@connectrpc/connect';
import type { RpcContext } from '@spraxium/rpc-server';
import { RpcSchemaValidator } from '@spraxium/rpc-server/runtime';
import type { RegisteredRpcHandler } from './interfaces/registered-rpc-handler.interface';
import type { RpcHandlerMetadata } from './interfaces/rpc-handler-metadata.interface';
import type { RpcHandlerOptions } from './interfaces/rpc-handler-options.interface';

import { RpcGuildIdValidator } from './rpc-guild-id.validator';

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

  validateInput(input: unknown): void {
    if (this.routing === 'guild') RpcGuildIdValidator.read(input);
  }

  prepare(input: unknown): (context: RpcContext) => unknown {
    if (!this.schema) return this.execute.bind(this, input);

    const guildId = this.routing === 'guild' ? RpcGuildIdValidator.read(input) : undefined;
    const parsed = RpcSchemaValidator.parse(this.schema, input, false);
    if (guildId !== undefined && RpcGuildIdValidator.read(parsed) !== guildId) {
      throw new ConnectError('RPC schema changed guildId.', Code.InvalidArgument);
    }

    return this.execute.bind(this, parsed);
  }

  execute(input: unknown, context: RpcContext): unknown {
    if (typeof this.method !== 'function') throw new Error(`RPC ${this.name} is not a method.`);
    return this.method.call(this.instance, input, context);
  }
}
