import { Code, ConnectError } from '@connectrpc/connect';
import type { RegisteredRpcMethod } from './interfaces/registered-rpc-method.interface';
import type { RpcMethodOptions } from './interfaces/rpc-method-options.interface';
import type { RpcMethodRegistry } from './interfaces/rpc-method-registry.interface';
import { RpcBoundMethod } from './rpc-bound-method';

export class RpcMethodMap implements RpcMethodRegistry<{ name: string }> {
  private readonly methods = new Map<string, RegisteredRpcMethod>();

  register<Input, Output>(name: string, options: RpcMethodOptions<Input, Output>): void {
    if (!/^[a-zA-Z][a-zA-Z0-9._-]{0,127}$/.test(name)) throw new Error('Invalid RPC method name.');
    if (this.methods.has(name)) throw new Error(`Duplicate RPC handler: ${name}.`);
    if (
      options.permissions !== undefined &&
      (!Array.isArray(options.permissions) ||
        options.permissions.some((permission) => typeof permission !== 'string' || !permission.trim()))
    ) {
      throw new Error(`RPC ${name} has invalid permissions.`);
    }
    if (!options.permissions?.length && options.allowAuthenticated !== true) {
      throw new Error(`RPC ${name} requires permissions or explicit allowAuthenticated: true.`);
    }
    if (typeof options.schema?.parse !== 'function' || typeof options.handle !== 'function') {
      throw new Error(`RPC ${name} requires an input schema and a handler.`);
    }
    if (options.responseSchema && typeof options.responseSchema.parse !== 'function') {
      throw new Error(`RPC ${name} has an invalid response schema.`);
    }

    this.methods.set(name, new RpcBoundMethod(name, options));
  }

  get(name: string): RegisteredRpcMethod {
    const method = this.methods.get(name);
    if (!method) throw new ConnectError('RPC handler not found.', Code.NotFound);
    return method;
  }

  descriptions(): Array<{ name: string }> {
    const descriptions: Array<{ name: string }> = [];
    for (const name of this.methods.keys()) descriptions.push({ name });
    return descriptions;
  }
}
