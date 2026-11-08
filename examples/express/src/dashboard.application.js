import { once } from 'node:events';
import { createServer } from 'node:http';
import { Code, RpcClientError } from '@spraxium/rpc-client';
import express from 'express';
import { ExampleEnvironment } from '../../shared/environment.service.js';

export class ExpressDashboard {
  constructor(rpc) {
    this.rpc = rpc;
    this.api = express();
    this.server = createServer(this.api);
  }

  async start() {
    if (this.server.listening || this.closing)
      throw new Error('Express dashboard has already been started or closed.');
    this.api.disable('x-powered-by');
    this.api.get('/guilds/:guildId/stats', this.stats.bind(this));
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

  async stats(request, response) {
    try {
      const stats = await this.rpc.call('guild.stats', { guildId: request.params.guildId });
      response.json(stats);
    } catch (error) {
      if (error instanceof RpcClientError && error.code === Code.NotFound)
        response.status(404).json({ error: 'Guild not found' });
      else if (error instanceof RpcClientError && error.code === Code.InvalidArgument)
        response.status(400).json({ error: 'Invalid guild ID' });
      else response.status(503).json({ error: 'Bot unavailable' });
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
