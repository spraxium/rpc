import type { RpcMethodContract } from '@spraxium/rpc-protocol';
import type { RpcServerOptions } from './configuration/interfaces/rpc-server-options.interface';
import { RpcServerConfigResolver } from './configuration/rpc-server-config.resolver';
import { RpcExecutor } from './execution/rpc.executor';
import type { RpcMethodOptions } from './handlers/interfaces/rpc-method-options.interface';
import { RpcMethodMap } from './handlers/rpc-method.registry';
import type { RpcLogger } from './transport/interfaces/rpc-logger.interface';
import type { RpcServer } from './transport/rpc.server';
import { RpcServerRuntime } from './transport/rpc-runtime.composition';

export class RpcGateway<Contract extends { [Method in keyof Contract]: RpcMethodContract }> {
  private readonly methods = new RpcMethodMap();
  private readonly server: RpcServer;
  private starting?: Promise<void>;
  private closing?: Promise<void>;

  constructor(options: RpcServerOptions, logger: RpcLogger) {
    const config = new RpcServerConfigResolver().resolve(options);
    this.server = RpcServerRuntime.create(config, new RpcExecutor(this.methods, config), logger);
  }

  /** The bound URL after start, including the selected port when configured with port 0. */
  get address(): string | undefined {
    return this.server.address;
  }

  /** Registers a named method. Register every method before starting the gateway. */
  register<Method extends keyof Contract & string>(
    name: Method,
    options: RpcMethodOptions<Contract[Method]['input'], Contract[Method]['output']>,
  ): void {
    if (this.starting || this.closing) throw new Error('Register RPC methods before starting the gateway.');
    this.methods.register(name, options);
  }

  /** Opens the listener. Concurrent starts share the same promise. */
  start(): Promise<void> {
    if (this.closing) return Promise.reject(new Error('The RPC gateway is closing or closed.'));
    this.starting ??= this.server.start();
    return this.starting;
  }

  /** Stops accepting calls, drains active requests, then closes the listener. */
  close(): Promise<void> {
    this.closing ??= this.shutdown();
    return this.closing;
  }

  private async shutdown(): Promise<void> {
    await this.starting?.catch(() => undefined);
    await this.server.close();
  }
}
