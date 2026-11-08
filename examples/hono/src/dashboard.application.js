import { once } from 'node:events';
import { serve } from '@hono/node-server';
import { Code, RpcClientError } from '@spraxium/rpc-client';
import { Hono } from 'hono';
import { ExampleEnvironment } from '../../shared/environment.service.js';

export class HonoDashboard {
  constructor(rpc) {
    this.rpc = rpc;
    this.api = new Hono();
  }

  async start() {
    if (this.server || this.closing) throw new Error('Hono dashboard has already been started or closed.');
    this.api.use(this.closeConnectionOnShutdown.bind(this));
    this.api.get('/guilds/:guildId/stats', this.stats.bind(this));
    this.api.onError(this.handleError.bind(this));
    this.server = serve({
      fetch: this.api.fetch,
      hostname: ExampleEnvironment.host(),
      port: ExampleEnvironment.port(),
    });
    try {
      await once(this.server, 'listening');
    } catch (error) {
      await this.close();
      throw error;
    }
  }

  close() {
    this.closing ??= this.shutdown();
    return this.closing;
  }

  async shutdown() {
    try {
      const server = this.server;
      if (server?.listening) {
        await new Promise((resolve) => server.close(() => resolve()));
      }
    } finally {
      this.rpc.close();
    }
  }

  async stats(context) {
    const guildId = context.req.param('guildId');
    if (!guildId) return context.json({ error: 'Invalid guild ID' }, 400);
    const stats = await this.rpc.call('guild.stats', { guildId });
    return context.json(stats);
  }

  async closeConnectionOnShutdown(context, next) {
    await next();
    if (this.closing) context.header('Connection', 'close');
  }

  handleError(error, context) {
    if (error instanceof RpcClientError && error.code === Code.NotFound)
      return context.json({ error: 'Guild not found' }, 404);
    if (error instanceof RpcClientError && error.code === Code.InvalidArgument)
      return context.json({ error: 'Invalid guild ID' }, 400);
    return context.json({ error: 'Bot unavailable' }, 503);
  }
}
