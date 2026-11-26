import { once } from 'node:events';
import type { Server } from 'node:net';
import type { BotRpcClient } from './types/bot-rpc-client.type.ts';

export class HttpServerLifecycle {
  #closing?: Promise<void>;

  constructor(
    private readonly server: Server,
    private readonly rpc: BotRpcClient,
  ) {}

  /** Waits for the listener and closes the SDK if the server cannot start. */
  async ready(): Promise<void> {
    try {
      if (!this.server.listening) await once(this.server, 'listening');
    } catch (error) {
      this.rpc.close();
      throw error;
    }

    process.once('SIGINT', this.#stop.bind(this));
    process.once('SIGTERM', this.#stop.bind(this));
  }

  #stop(): void {
    this.#closing ??= this.#shutdown().catch((error) => {
      console.error('Could not close the example HTTP server.', error);
      process.exitCode = 1;
    });
  }

  async #shutdown(): Promise<void> {
    try {
      await new Promise<void>((resolve, reject) => {
        this.server.close((error) => (error ? reject(error) : resolve()));
      });
    } finally {
      this.rpc.close();
    }
  }
}
