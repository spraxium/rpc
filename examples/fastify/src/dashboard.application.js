import { Code, RpcClientError } from '@spraxium/rpc-client';
import { ExampleEnvironment } from '../../shared/environment.service.js';

export class FastifyDashboard {
  constructor(rpc, api) {
    this.rpc = rpc;
    this.api = api;
  }

  async start() {
    this.api.get('/guilds/:guildId/stats', this.stats.bind(this));
    this.api.setErrorHandler(this.handleError.bind(this));
    this.api.addHook('onResponse', this.responseCompleted.bind(this));
    this.api.addHook('onClose', this.closeRpc.bind(this));
    try {
      await this.api.listen({ host: ExampleEnvironment.host(), port: ExampleEnvironment.port() });
    } catch (error) {
      await this.close();
      throw error;
    }
  }

  close() {
    this.closing ??= this.api.close();
    return this.closing;
  }

  async responseCompleted() {
    if (this.closing) this.api.server.closeIdleConnections();
  }

  async stats(request) {
    return this.rpc.call('guild.stats', { guildId: request.params.guildId });
  }

  handleError(error, _request, reply) {
    if (error instanceof RpcClientError && error.code === Code.NotFound)
      return reply.code(404).send({ error: 'Guild not found' });
    if (error instanceof RpcClientError && error.code === Code.InvalidArgument)
      return reply.code(400).send({ error: 'Invalid guild ID' });
    return reply.code(503).send({ error: 'Bot unavailable' });
  }

  async closeRpc() {
    this.rpc.close();
  }
}
