import type { RpcHandlerOptions } from './interfaces/rpc-handler-options.interface';
import { RpcHandlerMetadataStore } from './rpc-handler-metadata.store';
import { RpcHandlerOptionsValidator } from './rpc-handler-options.validator';

/**
 * Exposes a method on a Spraxium provider as an RPC handler.
 * @param name The name passed to the SDK, such as guild.stats.
 * @param options Routing, permissions and optional input and output schemas.
 * @throws Error if the name or options are invalid.
 */
export function RpcHandler(name: string, options: RpcHandlerOptions): MethodDecorator {
  RpcHandlerOptionsValidator.validate(name, options);
  return (target, key, descriptor) =>
    RpcHandlerMetadataStore.register(name, options, target, key, descriptor);
}
