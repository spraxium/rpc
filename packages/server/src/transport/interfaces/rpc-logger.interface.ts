export interface RpcLogger {
  info(message: string): unknown;
  error(message: string): unknown;
}
