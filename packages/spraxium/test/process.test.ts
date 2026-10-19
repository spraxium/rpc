import { type ChildProcess, fork } from 'node:child_process';
import { EventEmitter, once } from 'node:events';
import { fileURLToPath } from 'node:url';
import { createRpcClient } from '@spraxium/rpc-client';
import { afterEach, describe, expect, it } from 'vitest';
import { RpcRuntimeComposition } from '../src/integration/rpc-runtime.composition';
import { RpcShardDispatcher } from '../src/sharding/rpc-shard-dispatcher.service';
import type { RpcIpcMessage } from '../src/sharding/types/rpc-ipc-message.type';
import { RpcServer } from '../src/transport/rpc.server';
import { config, token } from './helpers';

const children: Array<ChildProcess> = [];
afterEach(async () => {
  await Promise.all(
    children.splice(0).map(async (child) => {
      if (child.exitCode !== null) return;
      const exited = once(child, 'exit');
      child.send({ kind: 'test-stop' });
      const timer = setTimeout(() => child.kill(), 2000);
      await exited;
      clearTimeout(timer);
    }),
  );
});

async function boot(shardId?: number) {
  const env = { ...process.env };
  if (shardId === undefined) env.SHARDS = undefined;
  else env.SHARDS = String(shardId);
  const child = fork(
    process.env.RPC_FRAMEWORK_FIXTURE ?? fileURLToPath(new URL('./fixtures/bot.mjs', import.meta.url)),
    [],
    {
      env,
      execArgv: [],
      stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
    },
  );
  children.push(child);
  let output = '';
  child.stdout?.on('data', (data: Buffer) => {
    output += data.toString();
  });
  child.stderr?.on('data', (data: Buffer) => {
    output += data.toString();
  });
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Child did not start: ${output}`));
    }, 10000);
    const ready = (message: unknown) => {
      if (message && typeof message === 'object' && 'kind' in message && message.kind === 'test-ready') {
        clearTimeout(timer);
        child.off('message', ready);
        child.off('exit', exited);
        resolve();
      }
    };
    const exited = () => {
      clearTimeout(timer);
      reject(new Error(`Child failed: ${output}`));
    };
    child.on('message', ready);
    child.once('exit', exited);
  });
  return { child, url: output.match(/http:\/\/127\.0\.0\.1:\d+/)?.[0] };
}

class ProcessShard extends EventEmitter {
  readonly ready = true;

  constructor(
    readonly id: number,
    readonly child: ChildProcess,
  ) {
    super();
    child.on('message', (message: unknown) => this.emit('message', message));
    child.on('exit', () => this.emit('death'));
  }

  send(message: RpcIpcMessage): Promise<void> {
    return new Promise((resolve, reject) =>
      this.child.send(message, (error) => (error ? reject(error) : resolve())),
    );
  }
}

describe('independent processes using built package imports', () => {
  it('calls a provider with imported constructor dependencies across a real TCP connection', async () => {
    const { url, child } = await boot();
    if (!url) throw new Error('No RPC listener address');
    const client = createRpcClient({ url, token });
    try {
      const result = await client.call('guild.stats', { guildId: '4194304' });
      expect(result).toEqual({ members: 42, shardId: 0, pid: child.pid });
      expect(child.pid).not.toBe(process.pid);
    } finally {
      client.close();
    }
  }, 15000);

  it('dispatches through real process IPC into the selected shard DI container', async () => {
    const first = await boot(0);
    const second = await boot(1);
    const shards = new Map([
      [0, new ProcessShard(0, first.child)],
      [1, new ProcessShard(1, second.child)],
    ]);
    const options = config();
    const dispatcher = new RpcShardDispatcher(shards, 2, options);
    await dispatcher.start();
    const server = RpcRuntimeComposition.createServer(options, dispatcher);
    await server.start();
    if (!server.address) throw new Error('No RPC listener address');
    const client = createRpcClient({ url: server.address, token });
    try {
      expect(await client.call('guild.stats', { guildId: '4194304' })).toEqual({
        members: 42,
        shardId: 1,
        pid: second.child.pid,
      });
      expect(await client.call('guild.stats', { guildId: '8388608' })).toEqual({
        members: 42,
        shardId: 0,
        pid: first.child.pid,
      });
      expect(dispatcher.pendingCount).toBe(0);
    } finally {
      client.close();
      await server.close();
    }
  }, 15000);
});
