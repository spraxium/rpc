import { Code, ConnectError } from '@connectrpc/connect';
import { Injectable } from '@spraxium/common';
import type { RegisteredRpcHandler } from './interfaces/registered-rpc-handler.interface';
import type { RpcHandlerDescription } from './interfaces/rpc-handler-description.interface';
import { RpcBoundHandler } from './rpc-bound.handler';
import { RpcHandlerMetadataStore } from './rpc-handler-metadata.store';

@Injectable()
export class RpcRegistry {
  private readonly handlers = new Map<string, RegisteredRpcHandler>();
  private readonly scanned = new WeakSet<object>();

  scan(instance: unknown): void {
    if (!instance || typeof instance !== 'object' || this.scanned.has(instance)) return;

    this.scanned.add(instance);
    const visited = new Set<string | symbol>();
    let prototype: object | null = Object.getPrototypeOf(instance);

    while (prototype && prototype !== Object.prototype) {
      for (const key of Reflect.ownKeys(prototype)) {
        if (visited.has(key)) continue;

        visited.add(key);
        const metadata = RpcHandlerMetadataStore.read(prototype, key);
        if (!metadata) continue;
        if (this.handlers.has(metadata.name)) throw new Error(`Duplicate RPC handler: ${metadata.name}.`);

        const method: unknown = Object.getOwnPropertyDescriptor(prototype, key)?.value;
        this.handlers.set(metadata.name, new RpcBoundHandler(metadata, instance, method));
      }

      prototype = Object.getPrototypeOf(prototype);
    }
  }

  get(name: string): RegisteredRpcHandler {
    const handler = this.handlers.get(name);
    if (!handler) throw new ConnectError('RPC handler not found.', Code.NotFound);

    return handler;
  }

  descriptions(): Array<RpcHandlerDescription> {
    const descriptions: Array<RpcHandlerDescription> = [];

    for (const { name, routing, permissions, allowAuthenticated } of this.handlers.values())
      descriptions.push({ name, routing, permissions, allowAuthenticated });

    return descriptions;
  }
}
