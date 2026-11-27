import { randomUUID } from 'node:crypto';
import { EventEmitter, once } from 'node:events';
import { Code } from '@connectrpc/connect';
import { decodeJson, encodeJson } from '@spraxium/rpc-protocol';
import { afterEach, describe, expect, it } from 'vitest';
import type { RpcDispatcher } from '../src/execution/interfaces/rpc-dispatcher.interface';
import { RpcExecutor } from '../src/execution/rpc.executor';
import { RpcHandler } from '../src/handlers/rpc-handler.decorator';
import { RpcRegistry } from '../src/handlers/rpc-handler.registry';
import type { RpcContext } from '../src/interfaces/rpc-context.interface';
import type { RpcIpcPeer } from '../src/sharding/interfaces/rpc-ipc-peer.interface';
import { RPC_IPC } from '../src/sharding/rpc-ipc.constant';
import { RpcShardDispatcher } from '../src/sharding/rpc-shard-dispatcher.service';
import { RpcShardWorker } from '../src/sharding/rpc-shard-worker.service';
import type { RpcIpcMessage } from '../src/sharding/types/rpc-ipc-message.type';
import { config, deferred } from './helpers';

class TestShard extends EventEmitter {
  ready = true;
  readonly child = new EventEmitter();
  readonly sent: Array<RpcIpcMessage> = [];
  failSend = false;
  readonly peer: RpcIpcPeer = {
    on: (event, listener) => this.child.on(event, listener),
    off: (event, listener) => this.child.off(event, listener),
    send: async (message) => {
      this.emit('message', JSON.parse(JSON.stringify(message)));
    },
  };

  constructor(readonly id: number) {
    super();
  }

  async send(message: RpcIpcMessage) {
    if (this.failSend) throw new Error('IPC failed');

    this.sent.push(message);
    this.child.emit('message', JSON.parse(JSON.stringify(message)));
  }
}

function context(timeoutMs = 1000): RpcContext {
  return {
    identity: { id: 'dashboard', permissions: ['guild:read'] },
    requestId: randomUUID(),
    deadline: new Date(Date.now() + timeoutMs),
    signal: new AbortController().signal,
  };
}

const cleanup: Array<() => Promise<void>> = [];

afterEach(async () => {
  for (const close of cleanup.splice(0).reverse()) await close();
});

async function createShards() {
  const shards = new Map<number, TestShard>();
  const calls = [0, 0];

  for (const id of [0, 1]) {
    class ShardService {
      constructor(readonly id: number) {}
    }

    class Handler {
      constructor(readonly service: ShardService) {}

      @RpcHandler('guild.stats', { routing: 'guild', permissions: ['guild:read'] })
      stats() {
        calls[id]++;
        return { shardId: this.service.id };
      }

      @RpcHandler('global', { routing: 'singleton', allowAuthenticated: true })
      global() {
        return { shardId: this.service.id };
      }
    }

    const shard = new TestShard(id);
    shards.set(id, shard);
    const registry = new RpcRegistry();
    registry.scan(new Handler(new ShardService(id)));
    const worker = new RpcShardWorker(shard.peer, new RpcExecutor(registry, config()), 1024);
    await worker.markReady();
    cleanup.push(() => worker.close(0));
  }

  const dispatcher = new RpcShardDispatcher(shards, 2, config());
  await dispatcher.start();
  cleanup.push(() => dispatcher.close(0));

  return { dispatcher, shards, calls };
}

describe('explicit shard request-response IPC', () => {
  it('detaches worker listeners even when executor shutdown fails', async () => {
    const shard = new TestShard(0);
    const executor: RpcDispatcher = {
      descriptions: () => [],
      invoke: async () => new Uint8Array(),
      close: async () => {
        throw new Error('Executor shutdown failed');
      },
    };
    const worker = new RpcShardWorker(shard.peer, executor, 1024);

    expect(shard.child.listenerCount('message')).toBe(1);
    await expect(worker.close(0)).rejects.toThrow('Executor shutdown failed');
    expect(shard.child.listenerCount('message')).toBe(0);
  });

  it('refreshes and revalidates a shard manifest after the shard becomes ready again', async () => {
    const { dispatcher, shards } = await createShards();
    const shard = shards.get(1);
    if (!shard) throw new Error('Missing shard');

    const payload = encodeJson({ guildId: '4194304' }, 1024);
    shard.emit('death');

    await expect(dispatcher.invoke('guild.stats', payload, context())).rejects.toMatchObject({
      code: Code.Unavailable,
    });

    shard.emit('ready');
    await new Promise<void>((resolve) => setImmediate(resolve));

    expect(decodeJson(await dispatcher.invoke('guild.stats', payload, context()), 1024)).toEqual({
      shardId: 1,
    });
  });

  it('ignores a manifest that arrived just before its shard disconnected', async () => {
    const { dispatcher, shards } = await createShards();
    const shard = shards.get(1);
    if (!shard) throw new Error('Missing shard');

    shard.emit('ready');
    shard.emit('disconnect');
    await new Promise<void>((resolve) => setImmediate(resolve));
    const payload = encodeJson({ guildId: '4194304' }, 1024);

    await expect(dispatcher.invoke('guild.stats', payload, context())).rejects.toMatchObject({
      code: Code.Unavailable,
    });
  });

  it('routes guilds using the actual Discord formula and executes only once in the destination container', async () => {
    const { dispatcher, shards, calls } = await createShards();
    const payload = encodeJson({ guildId: '4194304' }, 1024);

    expect(decodeJson(await dispatcher.invoke('guild.stats', payload, context()), 1024)).toEqual({
      shardId: 1,
    });
    expect(calls).toEqual([0, 1]);
    expect(shards.get(0)?.sent.filter((message) => message.kind === 'invoke')).toHaveLength(0);
    expect(dispatcher.pendingCount).toBe(0);
    expect(decodeJson(await dispatcher.invoke('global', encodeJson(null, 1024), context()), 1024)).toEqual({
      shardId: 0,
    });
  });

  it('rejects unregistered, unauthorized and invalid guild calls before dispatch', async () => {
    const { dispatcher } = await createShards();

    await expect(dispatcher.invoke('missing', encodeJson(null, 1024), context())).rejects.toMatchObject({
      code: Code.NotFound,
    });
    await expect(
      dispatcher.invoke('guild.stats', encodeJson({ guildId: 'bad' }, 1024), context()),
    ).rejects.toMatchObject({ code: Code.InvalidArgument });
    await expect(
      dispatcher.invoke('guild.stats', encodeJson({ guildId: '4194304' }, 1024), {
        ...context(),
        identity: { id: 'limited', permissions: [] },
      }),
    ).rejects.toMatchObject({ code: Code.PermissionDenied });
  });

  it('reports unavailable or dead shards, send failures and cleans pending requests', async () => {
    const { dispatcher, shards } = await createShards();
    const shard = shards.get(1);
    if (!shard) throw new Error('Missing shard');

    const payload = encodeJson({ guildId: '4194304' }, 1024);
    shard.ready = false;

    await expect(dispatcher.invoke('guild.stats', payload, context())).rejects.toMatchObject({
      code: Code.Unavailable,
    });

    shard.ready = true;
    shard.failSend = true;

    await expect(dispatcher.invoke('guild.stats', payload, context())).rejects.toMatchObject({
      code: Code.Unavailable,
    });
    expect(dispatcher.pendingCount).toBe(0);

    shard.failSend = false;
    shard.child.removeAllListeners('message');
    const pending = dispatcher.invoke('guild.stats', payload, context());
    shard.emit('death');

    await expect(pending).rejects.toMatchObject({ code: Code.Unavailable });
    expect(dispatcher.pendingCount).toBe(0);
  });

  it('handles IPC deadlines, cancellation and shutdown without leaving listeners or pending calls', async () => {
    const { dispatcher, shards } = await createShards();
    const shard = shards.get(1);
    if (!shard) throw new Error('Missing shard');

    shard.child.removeAllListeners('message');
    const payload = encodeJson({ guildId: '4194304' }, 1024);

    await expect(dispatcher.invoke('guild.stats', payload, context(20))).rejects.toMatchObject({
      code: Code.DeadlineExceeded,
    });

    const controller = new AbortController();
    const pending = dispatcher.invoke('guild.stats', payload, { ...context(), signal: controller.signal });
    controller.abort();

    await expect(pending).rejects.toMatchObject({ code: Code.Canceled });

    const closing = dispatcher.invoke('guild.stats', payload, context());
    await dispatcher.close(0);

    await expect(closing).rejects.toMatchObject({ code: Code.Unavailable });
    expect(dispatcher.pendingCount).toBe(0);
    expect(shard.listenerCount('message')).toBe(0);
    expect(shard.sent.some((message) => message.kind === 'cancel')).toBe(true);
  });

  it('ignores duplicate in-flight IDs and rejects inconsistent shard manifests', async () => {
    const release = deferred<null>();
    let count = 0;

    class Slow {
      @RpcHandler('slow', { routing: 'singleton', allowAuthenticated: true })
      slow() {
        count++;
        return release.promise;
      }
    }

    const shard = new TestShard(0);
    const registry = new RpcRegistry();
    registry.scan(new Slow());
    const worker = new RpcShardWorker(shard.peer, new RpcExecutor(registry, config()), 1024);
    await worker.markReady();
    cleanup.push(() => worker.close(0));
    const message: RpcIpcMessage = {
      rpc: RPC_IPC,
      kind: 'invoke',
      id: randomUUID(),
      method: 'slow',
      payload: 'null',
      identity: context().identity,
      deadline: Date.now() + 1000,
    };
    await shard.send(message);
    await shard.send(message);
    await Promise.resolve();

    expect(count).toBe(1);

    const completed = once(shard, 'message');
    release.resolve(null);
    await completed;
    await shard.send(message);
    await Promise.resolve();

    expect(count).toBe(1);

    const second = new TestShard(1);
    const emptyWorker = new RpcShardWorker(second.peer, new RpcExecutor(new RpcRegistry(), config()), 1024);
    await emptyWorker.markReady();
    cleanup.push(() => emptyWorker.close(0));
    const dispatcher = new RpcShardDispatcher(
      new Map([
        [0, shard],
        [1, second],
      ]),
      2,
      config(),
    );

    await expect(dispatcher.start()).rejects.toThrow('manifest differs');
    expect(shard.listenerCount('message')).toBe(0);
  });
});
