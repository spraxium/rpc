import 'reflect-metadata';
import type { RpcHandlerMetadata } from './interfaces/rpc-handler-metadata.interface';
import type { RpcHandlerOptions } from './interfaces/rpc-handler-options.interface';
import { RPC_HANDLER_METADATA } from './rpc-handler-metadata.constant';
import { RpcHandlerOptionsValidator } from './rpc-handler-options.validator';

export class RpcHandlerMetadataStore {
  static register<T>(
    name: string,
    options: RpcHandlerOptions,
    target: object,
    key: string | symbol,
    descriptor: TypedPropertyDescriptor<T>,
  ): void {
    if (typeof target === 'function' || typeof descriptor.value !== 'function')
      throw new Error(`RPC ${name} must decorate an instance method.`);
    if (Reflect.hasOwnMetadata(RPC_HANDLER_METADATA, target, key))
      throw new Error(`RPC method ${String(key)} is already decorated.`);

    Reflect.defineMetadata(
      RPC_HANDLER_METADATA,
      { name, ...options, permissions: [...(options.permissions ?? [])] },
      target,
      key,
    );
  }

  static read(target: object, key: string | symbol): RpcHandlerMetadata | undefined {
    const metadata: RpcHandlerMetadata | undefined = Reflect.getOwnMetadata(
      RPC_HANDLER_METADATA,
      target,
      key,
    );

    if (metadata) RpcHandlerOptionsValidator.validate(metadata.name, metadata);

    return metadata;
  }
}
