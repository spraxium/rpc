import { Code, type RpcClient, RpcClientError } from '@spraxium/rpc-client';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { BotRpcContract } from '../interfaces/bot-rpc-contract.interface';
import type { GuildStatsParams } from './interfaces/guild-stats-params.interface';

export class FastifyDashboard {
  private closing?: Promise<void>;

  constructor(
    private readonly rpc: RpcClient<BotRpcContract>,
    private readonly api: FastifyInstance,
  ) {}

  async start(): Promise<void> {
    this.api.get<{ Params: GuildStatsParams }>('/guilds/:guildId/stats', this.stats.bind(this));
    this.api.setErrorHandler(this.handleError.bind(this));
    this.api.addHook('onResponse', this.responseCompleted.bind(this));
    this.api.addHook('onClose', this.closeRpc.bind(this));

    try {
      await this.api.listen({ host: '0.0.0.0', port: 3000 });
    } catch (error) {
      await this.close();
      throw error;
    }
  }

  close(): Promise<void> {
    this.closing ??= this.api.close();
    return this.closing;
  }

  private async responseCompleted(): Promise<void> {
    if (this.closing) this.api.server.closeIdleConnections();
  }

  private async stats(request: FastifyRequest<{ Params: GuildStatsParams }>) {
    return this.rpc.call('guild.stats', { guildId: request.params.guildId });
  }

  private handleError(error: unknown, _request: FastifyRequest, reply: FastifyReply) {
    if (error instanceof RpcClientError && error.code === Code.NotFound)
      return reply.code(404).send({ error: 'Guild not found' });
    if (error instanceof RpcClientError && error.code === Code.InvalidArgument)
      return reply.code(400).send({ error: 'Invalid guild ID' });
    return reply.code(503).send({ error: 'Bot unavailable' });
  }

  private async closeRpc(): Promise<void> {
    this.rpc.close();
  }
}
