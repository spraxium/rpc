import { Code, ConnectError } from '@connectrpc/connect';
import { RpcFailureMapper } from '../execution/rpc-failure.mapper';
import type { RpcShard } from './interfaces/rpc-shard.interface';
import { RPC_IPC } from './rpc-ipc.constant';
import type { RpcIpcMessage } from './types/rpc-ipc-message.type';

export class RpcPendingRequest {
  readonly shardId: number;
  readonly completion: Promise<RpcIpcMessage>;
  private resolve?: (message: RpcIpcMessage) => void;
  private reject?: (error: ConnectError) => void;
  private timer?: ReturnType<typeof setTimeout>;
  private settled = false;
  private started = false;
  private readonly abort = this.cancel.bind(this);

  constructor(
    private readonly shard: RpcShard,
    private readonly message: RpcIpcMessage,
    private readonly timeoutMs: number,
    private readonly signal: AbortSignal | undefined,
    private readonly onFinish: (id: string) => void,
  ) {
    this.shardId = shard.id;
    this.completion = new Promise((resolve, reject) => {
      this.resolve = resolve;
      this.reject = reject;
    });
  }

  start(): Promise<RpcIpcMessage> {
    if (this.started || this.settled) return this.completion;
    if (this.signal?.aborted) {
      this.finish(undefined, RpcFailureMapper.fromCancellation(this.signal));
      return this.completion;
    }
    this.started = true;
    this.timer = setTimeout(this.abort, this.timeoutMs);
    this.signal?.addEventListener('abort', this.abort, { once: true });
    try {
      void this.shard.send(this.message).catch(this.sendFailed.bind(this));
    } catch {
      this.sendFailed();
    }
    return this.completion;
  }

  finish(response?: RpcIpcMessage, error?: ConnectError): void {
    if (this.settled) return;
    this.settled = true;
    clearTimeout(this.timer);
    this.signal?.removeEventListener('abort', this.abort);
    this.onFinish(this.message.id);
    if (error) this.reject?.(error);
    else if (response?.kind === 'error') this.reject?.(new ConnectError(response.message, response.code));
    else if (response) this.resolve?.(response);
    else this.reject?.(RpcFailureMapper.ipcUnavailable());
  }

  cancel(error?: unknown): void {
    if (this.settled) return;
    const reason =
      error instanceof ConnectError
        ? error
        : this.signal?.aborted
          ? RpcFailureMapper.fromCancellation(this.signal)
          : new ConnectError('RPC deadline exceeded.', Code.DeadlineExceeded);
    this.finish(undefined, reason);
    void this.sendCancellation().catch(() => undefined);
  }

  private async sendCancellation(): Promise<void> {
    await this.shard.send({ rpc: RPC_IPC, kind: 'cancel', id: this.message.id });
  }

  private sendFailed(): void {
    this.finish(undefined, RpcFailureMapper.ipcUnavailable());
  }
}
