import { serve } from '@hono/node-server';
import { Code, type RpcClient, RpcClientError } from '@spraxium/rpc-client';
import { type Context, Hono, type Next } from 'hono';
import type { BotRpcContract } from '../interfaces/bot-rpc-contract.interface';

export class HonoDashboard {
  private readonly api = new Hono();
  private server?: ReturnType<typeof serve>;
  private closing?: Promise<void>;

  constructor(private readonly rpc: RpcClient<BotRpcContract>) {}

  start(): void {
    if (this.server || this.closing) throw new Error('Hono dashboard has already been started or closed.');
    this.api.use(this.closeConnectionOnShutdown.bind(this));
    this.api.get('/guilds/:guildId/stats', this.stats.bind(this));
    this.api.onError(this.handleError.bind(this));
    this.server = serve({ fetch: this.api.fetch, hostname: '0.0.0.0', port: 3000 });
  }

  close(): Promise<void> {
    this.closing ??= this.shutdown();
    return this.closing;
  }

  private async shutdown(): Promise<void> {
    try {
      const server = this.server;
      if (server?.listening) {
        await new Promise<void>((resolve) => server.close(() => resolve()));
      }
    } finally {
      this.rpc.close();
    }
  }

  private async stats(context: Context) {
    const guildId = context.req.param('guildId');
    if (!guildId) return context.json({ error: 'Invalid guild ID' }, 400);
    const stats = await this.rpc.call('guild.stats', { guildId });
    return context.json(stats);
  }

  private async closeConnectionOnShutdown(context: Context, next: Next): Promise<void> {
    await next();
    if (this.closing) context.header('Connection', 'close');
  }

  private handleError(error: Error, context: Context) {
    if (error instanceof RpcClientError && error.code === Code.NotFound)
      return context.json({ error: 'Guild not found' }, 404);
    if (error instanceof RpcClientError && error.code === Code.InvalidArgument)
      return context.json({ error: 'Invalid guild ID' }, 400);
    return context.json({ error: 'Bot unavailable' }, 503);
  }
}
