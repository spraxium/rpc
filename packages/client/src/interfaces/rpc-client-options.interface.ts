export interface RpcClientOptions {
  /** Gateway base URL. Remote connections normally require HTTPS. */
  url: string;

  /** Credential configured on the destination gateway. Keep it in the calling service. */
  token: string;

  /** Default deadline in milliseconds. Defaults to 10,000. */
  timeoutMs?: number;
  maxPayloadBytes?: number;

  /** Connect is the default transport. gRPC requires HTTP/2. */
  protocol?: 'connect' | 'grpc';
  httpVersion?: '2' | '1.1';

  /** Allows a plaintext connection on an explicitly trusted network. */
  allowInsecure?: boolean;
}
