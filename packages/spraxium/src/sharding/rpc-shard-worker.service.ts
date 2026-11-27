import { Code, ConnectError } from '@connectrpc/connect';
import type { RpcDispatcher } from '../execution/interfaces/rpc-dispatcher.interface';
import type { RpcIpcPeer } from './interfaces/rpc-ipc-peer.interface';
import { RPC_IPC } from './rpc-ipc.constant';
import { RpcIpcValidator } from './rpc-ipc.validator';
import { RpcRequestHistory } from './rpc-request.history';
import type { RpcInvokeMessage } from './types/rpc-invoke-message.type';

export class RpcShardWorker {
  private static readonly historyLimit = 10000;
  private readonly active = new Map<string, AbortController>();
  private readonly history = new RpcRequestHistory();
  private stopping = false;
  private ready = false;
  private readonly describeRequests = new Set<string>();
  private readonly listener = this.handleMessage.bind(this);

  constructor(
    private readonly peer: RpcIpcPeer,
    private readonly executor: RpcDispatcher,
    private readonly maxPayloadBytes: number,
  ) {
    peer.on('message', this.listener);
  }

  async markReady(): Promise<void> {
    this.ready = true;
    for (const id of this.describeRequests) await this.sendManifest(id);
    this.describeRequests.clear();
  }

  async close(graceMs: number): Promise<void> {
    this.stopping = true;

    try {
      await this.executor.close(graceMs);
    } finally {
      for (const controller of this.active.values())
        controller.abort(new ConnectError('RPC shard is shutting down.', Code.Unavailable));

      this.active.clear();
      this.history.clear();
      this.describeRequests.clear();
      this.peer.off('message', this.listener);
    }
  }

  private handleMessage(message: unknown): void {
    void this.receive(message).catch(() => undefined);
  }

  private async receive(value: unknown): Promise<void> {
    if (!RpcIpcValidator.isMessage(value)) return;

    if (value.kind === 'cancel') {
      this.active.get(value.id)?.abort(new ConnectError('RPC call canceled.', Code.Canceled));
      this.describeRequests.delete(value.id);

      return;
    }

    if (value.kind !== 'describe' && value.kind !== 'invoke') return;

    if (this.stopping || (value.kind === 'invoke' && !this.ready)) {
      await this.sendFailure(value.id, Code.Unavailable, 'RPC shard is not ready.');
      return;
    }
    if (value.kind === 'describe') {
      if (!this.ready) {
        this.describeRequests.add(value.id);
        return;
      }

      await this.sendManifest(value.id);

      return;
    }

    await this.invoke(value);
  }

  private async invoke(value: RpcInvokeMessage): Promise<void> {
    const now = Date.now();
    this.history.expire(now);

    if (this.active.has(value.id) || this.history.has(value.id)) return;

    if (value.deadline <= now) {
      await this.sendFailure(value.id, Code.DeadlineExceeded, 'RPC deadline exceeded.');
      return;
    }
    if (this.history.size >= RpcShardWorker.historyLimit) {
      await this.sendFailure(value.id, Code.ResourceExhausted, 'RPC shard request limit exceeded.');
      return;
    }

    this.history.add(value.id, value.deadline);
    const controller = new AbortController();
    this.active.set(value.id, controller);

    try {
      if (Buffer.byteLength(value.payload) > this.maxPayloadBytes)
        throw new ConnectError('RPC payload limit exceeded.', Code.ResourceExhausted);

      const payload = await this.executor.invoke(value.method, Buffer.from(value.payload, 'utf8'), {
        requestId: value.id,
        identity: Object.freeze({
          id: value.identity.id,
          permissions: Object.freeze([...value.identity.permissions]),
        }),
        deadline: new Date(value.deadline),
        signal: controller.signal,
      });
      await this.peer.send({
        rpc: RPC_IPC,
        kind: 'result',
        id: value.id,
        payload: Buffer.from(payload).toString('utf8'),
      });
    } catch (error) {
      const safe =
        error instanceof ConnectError ? error : new ConnectError('RPC shard failed.', Code.Internal);
      await this.sendFailure(value.id, safe.code, safe.rawMessage);
    } finally {
      this.active.delete(value.id);
    }
  }

  private async sendManifest(id: string): Promise<void> {
    await this.peer.send({ rpc: RPC_IPC, kind: 'manifest', id, handlers: this.executor.descriptions() });
  }

  private async sendFailure(id: string, code: Code, message: string): Promise<void> {
    await this.peer.send({ rpc: RPC_IPC, kind: 'error', id, code, message });
  }
}
