import { once } from 'node:events';
import { createServer } from 'node:http';
import { Code, RpcClientError } from '@spraxium/rpc-client';
import Koa from 'koa';
import { ExampleEnvironment } from '../../shared/environment.service.js';

export class KoaDashboard {
  constructor(rpc) {
    this.rpc = rpc;
    this.api = new Koa();
    this.server = createServer(this.api.callback());
  }

  async start() {
    if (this.server.listening || this.closing)
      throw new Error('Koa dashboard has already been started or closed.');
    this.api.use(this.handleRequest.bind(this));
    const listening = once(this.server, 'listening');
    this.server.listen(ExampleEnvironment.port(), ExampleEnvironment.host());
    try {
      await listening;
    } catch (error) {
      await this.close();
      throw error;
    }
  }

  close() {
    this.closing ??= this.shutdown();
    return this.closing;
  }

  async handleRequest(context) {
    const route = /^\/guilds\/([^/]+)\/stats$/.exec(context.path);
    if (context.method !== 'GET' || !route) {
      context.status = 404;
      context.body = { error: 'Route not found' };
      return;
    }
    try {
      context.body = await this.rpc.call('guild.stats', { guildId: decodeURIComponent(route[1]) });
    } catch (error) {
      if (
        error instanceof URIError ||
        (error instanceof RpcClientError && error.code === Code.InvalidArgument)
      ) {
        context.status = 400;
        context.body = { error: 'Invalid guild ID' };
      } else if (error instanceof RpcClientError && error.code === Code.NotFound) {
        context.status = 404;
        context.body = { error: 'Guild not found' };
      } else {
        context.status = 503;
        context.body = { error: 'Bot unavailable' };
      }
    }
  }

  async shutdown() {
    try {
      if (this.server.listening) await new Promise((resolve) => this.server.close(() => resolve()));
    } finally {
      this.rpc.close();
    }
  }
}
