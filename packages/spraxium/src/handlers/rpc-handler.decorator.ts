import type { RpcHandlerOptions } from './interfaces/rpc-handler-options.interface';
import { RpcHandlerMetadataStore } from './rpc-handler-metadata.store';
import { RpcHandlerOptionsValidator } from './rpc-handler-options.validator';

export function RpcHandler(name: string, options: RpcHandlerOptions): MethodDecorator {
  RpcHandlerOptionsValidator.validate(name, options);
  return (target, key, descriptor) =>
    RpcHandlerMetadataStore.register(name, options, target, key, descriptor);
}
