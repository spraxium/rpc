import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import {
  createSecureServer,
  createServer,
  type Http2SecureServer,
  type Http2Server,
  type ServerHttp2Session,
} from 'node:http2';
import type { Socket } from 'node:net';
import { Code, ConnectError, type ConnectRouter, type HandlerContext } from '@connectrpc/connect';
import { connectNodeAdapter } from '@connectrpc/connect-node';
import { type InvokeRequest, RpcGateway } from '@spraxium/rpc-protocol';
import type { ResolvedRpcConfig } from '../configuration/interfaces/resolved-rpc-config.interface';
import type { RpcDispatcher } from '../execution/interfaces/rpc-dispatcher.interface';
import { RpcCancellation } from '../execution/rpc-cancellation.service';
import { RpcFailureMapper } from '../execution/rpc-failure.mapper';
import type { RpcAuthenticator } from '../security/interfaces/rpc-authenticator.interface';
import type { RpcRateLimiter } from '../security/interfaces/rpc-rate-limiter.interface';
import type { RpcLogger } from './interfaces/rpc-logger.interface';

export class RpcServer {
  private readonly registeredMethods: Set<string>;
  private server?: Http2Server | Http2SecureServer;
  private readonly sessions = new Set<ServerHttp2Session>();
  private readonly sockets = new Set<Socket>();
  private readonly active = new Map<string, AbortController>();
  private stopping = false;
  private closing?: Promise<void>;

  constructor(
    private readonly config: ResolvedRpcConfig,
    private readonly dispatcher: RpcDispatcher,
    private readonly authenticator: RpcAuthenticator,
    private readonly rateLimiter: RpcRateLimiter,
    private readonly log: RpcLogger,
  ) {
    this.registeredMethods = new Set();
    for (const handler of dispatcher.descriptions()) this.registeredMethods.add(handler.name);
  }

  get address(): string | undefined {
    const address = this.server?.address();
    if (!address || typeof address === 'string') return undefined;

    return `${this.config.tls ? 'https' : 'http'}://${address.family === 'IPv6' ? `[${address.address}]` : address.address}:${address.port}`;
  }

  async start(): Promise<void> {
    if (!this.config.enabled) return;
    if (this.server || this.stopping) throw new Error('RPC server has already been started or closed.');

    const adapter = connectNodeAdapter({
      routes: this.registerRoutes.bind(this),
      readMaxBytes: this.config.maxPayloadBytes * 2 + 4096,
      writeMaxBytes: this.config.maxPayloadBytes * 2 + 4096,
      maxTimeoutMs: 2147483647,
    });
    const server = this.config.tls
      ? createSecureServer({ ...this.config.tls, allowHTTP1: true, maxHeaderListPairs: 64 }, adapter)
      : createServer({ maxHeaderListPairs: 64 }, adapter);
    this.server = server;
    server.on('session', this.trackSession.bind(this));
    server.on('connection', this.trackSocket.bind(this));
    server.on('error', this.listenerFailed.bind(this));
    const listening = once(server, 'listening');
    server.listen(this.config.port, this.config.host);
    await listening;
    this.log.info(
      `Registered ${this.dispatcher.descriptions().length} RPC handlers; listening on ${this.address}`,
    );
  }

  close(): Promise<void> {
    this.closing ??= this.shutdown();
    return this.closing;
  }

  private registerRoutes(router: ConnectRouter): void {
    router.service(RpcGateway, { invoke: this.invoke.bind(this) });
  }

  private trackSession(session: ServerHttp2Session): void {
    this.sessions.add(session);
    session.once('close', this.releaseSession.bind(this, session));
  }

  private releaseSession(session: ServerHttp2Session): void {
    this.sessions.delete(session);
  }

  private trackSocket(socket: Socket): void {
    this.sockets.add(socket);
    socket.once('close', this.releaseSocket.bind(this, socket));
  }

  private releaseSocket(socket: Socket): void {
    this.sockets.delete(socket);
  }

  private listenerFailed(): void {
    this.log.error('RPC listener error.');
  }

  private validateRequest(request: InvokeRequest): void {
    if (this.active.size >= this.config.maxConcurrentCalls)
      throw new ConnectError('RPC concurrency limit exceeded.', Code.ResourceExhausted);
    if (!/^[a-zA-Z][a-zA-Z0-9._-]{0,127}$/.test(request.method))
      throw new ConnectError('Invalid RPC method name.', Code.InvalidArgument);
    if (request.payloadJson.byteLength > this.config.maxPayloadBytes)
      throw new ConnectError('RPC payload limit exceeded.', Code.ResourceExhausted);
  }

  private async invoke(
    request: InvokeRequest,
    context: HandlerContext,
  ): Promise<{
    payloadJson: Uint8Array;
  }> {
    const startedAt = Date.now();
    const requestId = randomUUID();
    context.responseHeader.set('x-request-id', requestId);
    let code: Code | undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let controller: AbortController | undefined;
    const cancel = () => controller?.abort(RpcFailureMapper.fromCancellation(context.signal));

    try {
      if (this.stopping) throw new ConnectError('RPC is shutting down.', Code.Unavailable);

      const identity = this.authenticator.authenticate(context.requestHeader.get('authorization'));
      this.rateLimiter.check(identity);
      this.validateRequest(request);
      controller = new AbortController();
      context.signal.addEventListener('abort', cancel, { once: true });

      if (context.signal.aborted) cancel();

      const timeout = Math.min(this.config.timeoutMs, context.timeoutMs() ?? this.config.timeoutMs);
      timer = setTimeout(
        () => controller?.abort(new ConnectError('RPC deadline exceeded.', Code.DeadlineExceeded)),
        timeout,
      );
      this.active.set(requestId, controller);
      const payloadJson = await RpcCancellation.wait(
        this.dispatcher.invoke(request.method, request.payloadJson, {
          identity,
          requestId,
          deadline: new Date(Date.now() + timeout),
          signal: controller.signal,
        }),
        controller.signal,
      );

      return { payloadJson };
    } catch (error) {
      const safe =
        error instanceof ConnectError ? error : new ConnectError('RPC request failed.', Code.Internal);
      code = safe.code;

      throw safe;
    } finally {
      clearTimeout(timer);
      context.signal.removeEventListener('abort', cancel);
      this.active.delete(requestId);
      const method = this.registeredMethods.has(request.method) ? request.method : '<unregistered>';
      this.log.info(
        `method=${method} requestId=${requestId} durationMs=${Date.now() - startedAt} code=${code ?? 'OK'}`,
      );
    }
  }

  private async shutdown(): Promise<void> {
    this.stopping = true;
    const closed = new Promise<void>((resolve) => {
      if (!this.server?.listening) resolve();
      else this.server.close(() => resolve());
    });

    try {
      await this.dispatcher.close(this.config.shutdownGraceMs);
    } finally {
      await this.closeConnections(closed);
    }
  }

  private async closeConnections(closed: Promise<void>): Promise<void> {
    for (const controller of this.active.values())
      controller.abort(new ConnectError('RPC is shutting down.', Code.Unavailable));

    await new Promise<void>((resolve) => setImmediate(resolve));
    for (const session of this.sessions) session.close();
    await RpcCancellation.waitForSettled([closed], 100);
    for (const session of this.sessions) session.destroy();
    for (const socket of this.sockets) socket.destroy();
    await closed;
  }
}
