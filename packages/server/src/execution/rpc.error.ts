import { Code } from '@connectrpc/connect';

/** A handler error whose message is safe to send to callers. */
export class RpcError extends Error {
  /**
   * @param message A public description of the failure.
   * @param code The status code returned to the caller. Defaults to Internal.
   */
  constructor(
    message: string,
    readonly code: Code = Code.Internal,
  ) {
    super(message);
    this.name = 'RpcError';
  }
}
