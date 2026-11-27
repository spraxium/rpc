import type { SpraxiumOnBoot, SpraxiumOnShutdown } from '@spraxium/common';
import { Inject, Injectable } from '@spraxium/common';
import type { RpcServer } from '@spraxium/rpc-server/runtime';
import { RpcExecutor } from '@spraxium/rpc-server/runtime';
import { RpcConfigResolver } from '../configuration/rpc-config.resolver';
import type { RpcHandlerDescription } from '../handlers/interfaces/rpc-handler-description.interface';
import { RpcRegistry } from '../handlers/rpc-handler.registry';
import { ProcessIpcPeer } from '../sharding/process-ipc.peer';
import { RpcShardWorker } from '../sharding/rpc-shard-worker.service';
import type { RpcFrameworkHost } from './interfaces/rpc-framework-host.interface';
import { RpcRuntimeComposition } from './rpc-runtime.composition';
import { SpraxiumRpcHost } from './spraxium-rpc.host';

@Injectable()
export class RpcLifecycle implements SpraxiumOnBoot, SpraxiumOnShutdown {
  private executor?: RpcExecutor<RpcHandlerDescription>;
  private worker?: RpcShardWorker;
  private server?: RpcServer;
  private shutdownPromise?: Promise<void>;
  private shutdownGraceMs = 5000;

  constructor(
    @Inject(SpraxiumRpcHost)
    private readonly host: RpcFrameworkHost,
    @Inject(RpcRegistry)
    private readonly registry: RpcRegistry,
    @Inject(RpcConfigResolver)
    private readonly resolver: RpcConfigResolver,
  ) {}

  onBoot(): void {
    this.host.assertCompatible();
    const raw = this.host.configuration();
    if (!raw || raw.enabled === false) return;

    const config = this.resolver.resolve(raw);
    this.shutdownGraceMs = config.shutdownGraceMs;
    this.executor = new RpcExecutor(this.registry, config);

    if (this.host.isShardChild())
      this.worker = new RpcShardWorker(new ProcessIpcPeer(), this.executor, config.maxPayloadBytes);
    else this.server = RpcRuntimeComposition.createServer(config, this.executor);
  }

  async onApplicationReady(): Promise<void> {
    if (this.shutdownPromise) return;

    await this.worker?.markReady();
    await this.server?.start();
  }

  onShutdown(): Promise<void> {
    this.shutdownPromise ??= this.shutdown();
    return this.shutdownPromise;
  }

  private async shutdown(): Promise<void> {
    if (this.server) await this.server.close();
    else if (this.worker) await this.worker.close(this.shutdownGraceMs);
    else await this.executor?.close(this.shutdownGraceMs);
  }
}
