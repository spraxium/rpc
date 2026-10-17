export interface RpcClientOptions {
  url: string;
  token: string;
  timeoutMs?: number;
  maxPayloadBytes?: number;
  protocol?: 'connect' | 'grpc';
  httpVersion?: '2' | '1.1';
  allowInsecure?: boolean;
}
