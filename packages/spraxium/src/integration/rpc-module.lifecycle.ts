import type { ReadonlyContainer } from '@spraxium/common';
import { RpcRegistry } from '../handlers/rpc-handler.registry';
import type { RpcApplicationLifecycle } from './interfaces/rpc-application-lifecycle.interface';
import { RpcLifecycle } from './rpc.lifecycle';

export class RpcModuleLifecycle implements RpcApplicationLifecycle {
  private readonly pendingInstances: Array<unknown> = [];
  private registry?: RpcRegistry;

  constructor(private readonly container: ReadonlyContainer) {}

  onInstance(instance: unknown): void {
    if (this.registry) this.registry.scan(instance);
    else this.pendingInstances.push(instance);
  }

  onBoot(): void {
    this.registry = this.container.get<RpcRegistry>(RpcRegistry);
    if (!this.registry) throw new Error('RpcModule must provide RpcRegistry.');
    for (const instance of this.pendingInstances) this.registry.scan(instance);
    this.pendingInstances.length = 0;
  }

  async onApplicationReady(): Promise<void> {
    await this.lifecycle().onApplicationReady();
  }

  async onShutdown(): Promise<void> {
    this.pendingInstances.length = 0;
    await this.lifecycle().onShutdown();
  }

  private lifecycle(): RpcLifecycle {
    const lifecycle = this.container.get<RpcLifecycle>(RpcLifecycle);
    if (!lifecycle) throw new Error('RpcModule must provide RpcLifecycle.');
    return lifecycle;
  }
}
