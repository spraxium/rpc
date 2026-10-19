import { EventEmitter } from 'node:events';
import { Code } from '@connectrpc/connect';
import { describe, expect, it, vi } from 'vitest';
import { RPC_IPC } from '../src/sharding/rpc-ipc.constant';
import { RpcPendingRequest } from '../src/sharding/rpc-pending.request';
import type { RpcIpcMessage } from '../src/sharding/types/rpc-ipc-message.type';

class PendingShard extends EventEmitter {
  readonly id = 0;
  readonly ready = true;
  readonly sent: Array<RpcIpcMessage> = [];
  failSynchronously = false;

  send(message: RpcIpcMessage): Promise<void> {
    if (this.failSynchronously) throw new Error('Closed IPC channel');
    this.sent.push(message);
    return Promise.resolve();
  }
}

describe('pending shard requests', () => {
  it('does not send a request that was canceled before it started', async () => {
    const shard = new PendingShard();
    const controller = new AbortController();
    controller.abort();
    const finish = vi.fn();
    const request = new RpcPendingRequest(
      shard,
      { rpc: RPC_IPC, kind: 'describe', id: 'canceled' },
      1000,
      controller.signal,
      finish,
    );
    await expect(request.start()).rejects.toMatchObject({ code: Code.Canceled });
    expect(shard.sent).toHaveLength(0);
    expect(finish).toHaveBeenCalledExactlyOnceWith('canceled');
  });

  it('starts once and does not send a cancellation after its response arrived', async () => {
    const shard = new PendingShard();
    const finish = vi.fn();
    const request = new RpcPendingRequest(
      shard,
      { rpc: RPC_IPC, kind: 'describe', id: 'completed' },
      1000,
      undefined,
      finish,
    );
    const completion = request.start();
    expect(request.start()).toBe(completion);
    const response: RpcIpcMessage = { rpc: RPC_IPC, kind: 'manifest', id: 'completed', handlers: [] };
    request.finish(response);
    await expect(completion).resolves.toEqual(response);
    request.cancel();
    expect(shard.sent).toHaveLength(1);
    expect(finish).toHaveBeenCalledOnce();
  });

  it('releases the request when an IPC send throws synchronously', async () => {
    const shard = new PendingShard();
    shard.failSynchronously = true;
    const finish = vi.fn();
    const request = new RpcPendingRequest(
      shard,
      { rpc: RPC_IPC, kind: 'describe', id: 'failed' },
      1000,
      undefined,
      finish,
    );
    await expect(request.start()).rejects.toMatchObject({ code: Code.Unavailable });
    expect(finish).toHaveBeenCalledExactlyOnceWith('failed');
  });
});
