import type { IncomingMessage, ServerResponse } from 'node:http';
import { Code, RpcClientError } from '@spraxium/rpc-client';
import type { BotRpcClient } from '@spraxium/rpc-example-shared/bot-rpc-client';

export class GuildStatsEndpoint {
  constructor(private readonly rpc: BotRpcClient) {}

  /** Serves the guild stats route on a Node HTTP server. */
  async handle(request: IncomingMessage, response: ServerResponse): Promise<void> {
    const pathname = request.url?.split('?')[0] ?? '';
    const route = /^\/guilds\/([^/]+)\/stats$/.exec(pathname);

    if (request.method !== 'GET' || !route) {
      this.#send(response, 404, { error: 'Route not found' });
      return;
    }

    const controller = new AbortController();
    const cancel = () => {
      if (!response.writableEnded) controller.abort();
    };
    response.once('close', cancel);

    try {
      const guildId = decodeURIComponent(route[1]);
      const stats = await this.rpc.call('guild.stats', { guildId }, { signal: controller.signal });
      this.#send(response, 200, stats);
    } catch (error) {
      if (
        error instanceof URIError ||
        (error instanceof RpcClientError && error.code === Code.InvalidArgument)
      )
        this.#send(response, 400, { error: 'Invalid guild ID' });
      else if (error instanceof RpcClientError && error.code === Code.NotFound)
        this.#send(response, 404, { error: 'Guild not found' });
      else this.#send(response, 503, { error: 'Bot unavailable' });
    } finally {
      response.off('close', cancel);
    }
  }

  #send(response: ServerResponse, status: number, body: unknown): void {
    if (response.destroyed) return;

    response.writeHead(status, { 'content-type': 'application/json; charset=utf-8' });
    response.end(JSON.stringify(body));
  }
}
