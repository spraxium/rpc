import type { RpcHandlerOptions } from './interfaces/rpc-handler-options.interface';

export class RpcHandlerOptionsValidator {
  static validate(name: string, options: RpcHandlerOptions): void {
    if (!/^[a-zA-Z][a-zA-Z0-9._-]{0,127}$/.test(name)) throw new Error('Invalid RPC handler name.');
    if (!options || !['guild', 'singleton'].includes(options.routing))
      throw new Error(`RPC ${name} requires routing.`);
    if (
      options.permissions !== undefined &&
      !RpcHandlerOptionsValidator.validPermissions(options.permissions)
    ) {
      throw new Error(`RPC ${name} has invalid permissions.`);
    }
    if (!options.permissions?.length && options.allowAuthenticated !== true) {
      throw new Error(`RPC ${name} requires permissions or explicit allowAuthenticated: true.`);
    }
    if (options.schema && typeof options.schema.parse !== 'function')
      throw new Error(`RPC ${name} has an invalid schema.`);
    if (options.responseSchema && typeof options.responseSchema.parse !== 'function')
      throw new Error(`RPC ${name} has an invalid responseSchema.`);
  }

  private static validPermissions(value: unknown): boolean {
    if (!Array.isArray(value)) return false;
    for (const permission of value) {
      if (typeof permission !== 'string' || !permission.trim()) return false;
    }
    return true;
  }
}
