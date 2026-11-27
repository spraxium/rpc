import { Agent as HttpAgent } from 'node:http';
import { Agent as HttpsAgent } from 'node:https';
import { createClient } from '@connectrpc/connect';
import { createConnectTransport, createGrpcTransport, Http2SessionManager } from '@connectrpc/connect-node';
import { RpcGateway } from '@spraxium/rpc-protocol';
import type { ResolvedRpcClientOptions } from '../interfaces/resolved-rpc-client-options.interface';
import type { RpcCallOptions } from '../interfaces/rpc-call-options.interface';
import type { RpcGatewayConnection } from '../interfaces/rpc-gateway-connection.interface';

export class ConnectRpcConnection implements RpcGatewayConnection {
  private readonly sessionManager?: Http2SessionManager;
  private readonly agent?: HttpAgent | HttpsAgent;
  private readonly gateway;

  constructor(private readonly options: ResolvedRpcClientOptions) {
    const url = new URL(options.url);

    if (options.httpVersion === '1.1') {
      this.agent =
        url.protocol === 'https:' ? new HttpsAgent({ keepAlive: true }) : new HttpAgent({ keepAlive: true });
    } else {
      this.sessionManager = new Http2SessionManager(url);
    }

    this.gateway = createClient(RpcGateway, this.createTransport());
  }

  async invoke(method: string, payloadJson: Uint8Array, options: RpcCallOptions): Promise<Uint8Array> {
    const response = await this.gateway.invoke(
      { method, payloadJson },
      {
        headers: { authorization: `Bearer ${this.options.token}` },
        timeoutMs: options.timeoutMs ?? this.options.timeoutMs,
        signal: options.signal,
      },
    );
    return response.payloadJson;
  }

  close(): void {
    this.sessionManager?.abort();
    this.agent?.destroy();
  }

  private createTransport() {
    const limits = {
      baseUrl: this.options.url,
      readMaxBytes: this.options.maxPayloadBytes * 2 + 4096,
      writeMaxBytes: this.options.maxPayloadBytes * 2 + 4096,
      defaultTimeoutMs: this.options.timeoutMs,
    };

    if (this.options.protocol === 'grpc')
      return createGrpcTransport({ ...limits, sessionManager: this.sessionManager });

    if (this.options.httpVersion === '1.1') {
      return createConnectTransport({ ...limits, httpVersion: '1.1', nodeOptions: { agent: this.agent } });
    }

    return createConnectTransport({ ...limits, httpVersion: '2', sessionManager: this.sessionManager });
  }
}
