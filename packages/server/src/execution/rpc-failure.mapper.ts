import { Code, ConnectError } from '@connectrpc/connect';

export class RpcFailureMapper {
  static fromPayload(error: unknown): ConnectError {
    return new ConnectError(
      error instanceof RangeError ? 'RPC payload limit exceeded.' : 'Invalid JSON payload.',
      error instanceof RangeError ? Code.ResourceExhausted : Code.InvalidArgument,
    );
  }

  static fromCancellation(signal: AbortSignal): ConnectError {
    return signal.reason instanceof ConnectError
      ? signal.reason
      : new ConnectError('RPC call canceled.', Code.Canceled);
  }

  static ipcUnavailable(): ConnectError {
    return new ConnectError('RPC shard IPC unavailable.', Code.Unavailable);
  }
}
