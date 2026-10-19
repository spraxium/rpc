import { Code } from '@connectrpc/connect';

export class RpcError extends Error {
  constructor(
    message: string,
    readonly code: Code = Code.Internal,
  ) {
    super(message);
    this.name = 'RpcError';
  }
}
