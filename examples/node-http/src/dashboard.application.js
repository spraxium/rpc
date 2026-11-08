import { once } from 'node:events';
import { createServer } from 'node:http';
import { Code, RpcClientError } from '@spraxium/rpc-client';
import { ExampleEnvironment } from '../../shared/environment.service.js';

export class NodeHttpDashboard {
  constructor(rpc) {
    this.rpc = rpc;
    this.server = createServer(this.receive.bind(this));
  }

  async start() {
    if (this.server.listening || this.closing)
      throw new Error('Node HTTP dashboard has already been started or closed.');
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

  receive(request, response) {
    void this.handleRequest(request, response).catch(() => response.destroy());
  }

  async handleRequest(request, response) {
    const controller = new AbortController();
    const cancel = this.cancelResponse.bind(this, response, controller);
    response.once('close', cancel);
    try {
      const path = new URL(request.url ?? '/', 'http://127.0.0.1').pathname;
      const route = /^\/guilds\/([^/]+)\/stats$/.exec(path);
      if (request.method !== 'GET' || !route) {
        this.send(response, 404, { error: 'Route not found' });
        return;
      }
      const stats = await this.rpc.call(
        'guild.stats',
        { guildId: decodeURIComponent(route[1]) },
        { signal: controller.signal },
      );
      this.send(response, 200, stats);
    } catch (error) {
      if (
        error instanceof URIError ||
        (error instanceof RpcClientError && error.code === Code.InvalidArgument)
      )
        this.send(response, 400, { error: 'Invalid guild ID' });
      else if (error instanceof RpcClientError && error.code === Code.NotFound)
        this.send(response, 404, { error: 'Guild not found' });
      else this.send(response, 503, { error: 'Bot unavailable' });
    } finally {
      response.off('close', cancel);
    }
  }

  cancelResponse(response, controller) {
    if (!response.writableEnded) controller.abort();
  }

  send(response, status, body) {
    if (response.destroyed) return;
    response.writeHead(status, { 'content-type': 'application/json; charset=utf-8' });
    response.end(JSON.stringify(body));
  }

  async shutdown() {
    try {
      if (this.server.listening) await new Promise((resolve) => this.server.close(() => resolve()));
    } finally {
      this.rpc.close();
    }
  }
}
