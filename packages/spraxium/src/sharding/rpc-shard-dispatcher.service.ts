import { randomUUID } from 'node:crypto';
import { Code, ConnectError } from '@connectrpc/connect';
import { decodeJson } from '@spraxium/rpc-protocol';
import { ShardClientUtil } from 'discord.js';
import type { ResolvedRpcConfig } from '../configuration/interfaces/resolved-rpc-config.interface';
import type { RpcDispatcher } from '../execution/interfaces/rpc-dispatcher.interface';
import { RpcCancellation } from '../execution/rpc-cancellation.service';
import { RpcFailureMapper } from '../execution/rpc-failure.mapper';
import type { RpcHandlerDescription } from '../handlers/interfaces/rpc-handler-description.interface';
import { RpcGuildIdValidator } from '../handlers/rpc-guild-id.validator';
import { RpcHandlerOptionsValidator } from '../handlers/rpc-handler-options.validator';
import type { RpcContext } from '../interfaces/rpc-context.interface';
import { RpcAccessPolicy } from '../security/rpc-access.policy';
import type { RpcShard } from './interfaces/rpc-shard.interface';
import type { RpcShardListeners } from './interfaces/rpc-shard-listeners.interface';
import { RPC_IPC } from './rpc-ipc.constant';
import { RpcIpcValidator } from './rpc-ipc.validator';
import { RpcPendingRequest } from './rpc-pending.request';
import type { RpcIpcMessage } from './types/rpc-ipc-message.type';

export class RpcShardDispatcher implements RpcDispatcher {
  private readonly handlers = new Map<string, RpcHandlerDescription>();
  private readonly available = new Set<number>();
  private readonly descriptionsInProgress = new Map<number, string>();
  private readonly pending = new Map<string, RpcPendingRequest>();
  private readonly subscriptions: Array<RpcShardListeners> = [];
  private stopping = false;
  private manifestSignature?: string;

  constructor(
    private readonly shards: ReadonlyMap<number, RpcShard>,
    private readonly totalShards: number,
    private readonly config: ResolvedRpcConfig,
  ) {
    if (!Number.isSafeInteger(totalShards) || totalShards < 1)
      throw new Error('RPC requires the resolved Discord shard count.');
    for (const shard of shards.values()) {
      const listeners: RpcShardListeners = {
        shard,
        message: this.receive.bind(this, shard),
        unavailable: this.markUnavailable.bind(this, shard),
        ready: this.refresh.bind(this, shard),
      };
      shard.on('message', listeners.message);
      shard.on('death', listeners.unavailable);
      shard.on('disconnect', listeners.unavailable);
      shard.on('ready', listeners.ready);
      this.subscriptions.push(listeners);
    }
  }

  async start(): Promise<void> {
    if (!this.shards.size) throw new Error('RPC requires at least one local shard.');
    try {
      const descriptions: Array<Promise<void>> = [];
      for (const shard of this.shards.values()) descriptions.push(this.describe(shard));
      await Promise.all(descriptions);
    } catch (error) {
      await this.close(0);
      throw error;
    }
  }

  private async describe(shard: RpcShard): Promise<void> {
    this.available.delete(shard.id);
    const id = randomUUID();
    this.descriptionsInProgress.set(shard.id, id);
    try {
      const message = await this.request(
        shard,
        { rpc: RPC_IPC, kind: 'describe', id },
        this.config.timeoutMs,
      );
      if (this.descriptionsInProgress.get(shard.id) !== id) return;
      if (this.stopping || message.kind !== 'manifest') throw RpcFailureMapper.ipcUnavailable();
      this.registerManifest(shard.id, message.handlers);
      this.available.add(shard.id);
    } finally {
      if (this.descriptionsInProgress.get(shard.id) === id) this.descriptionsInProgress.delete(shard.id);
    }
  }

  private registerManifest(shardId: number, handlers: ReadonlyArray<RpcHandlerDescription>): void {
    const descriptions = new Map<string, RpcHandlerDescription>();
    for (const handler of handlers) {
      RpcHandlerOptionsValidator.validate(handler.name, handler);
      if (descriptions.has(handler.name)) throw new Error(`Duplicate RPC handler: ${handler.name}.`);
      descriptions.set(handler.name, handler);
    }
    const signature = this.canonical([...descriptions.values()]);
    if (this.manifestSignature !== undefined && signature !== this.manifestSignature) {
      throw new Error(`RPC handler manifest differs on shard ${shardId}.`);
    }
    if (this.manifestSignature === undefined) {
      for (const [name, handler] of descriptions) this.handlers.set(name, handler);
      this.manifestSignature = signature;
    }
  }

  descriptions() {
    return [...this.handlers.values()];
  }

  get pendingCount(): number {
    return this.pending.size;
  }

  async invoke(method: string, payload: Uint8Array, context: RpcContext): Promise<Uint8Array> {
    if (this.stopping) throw RpcFailureMapper.ipcUnavailable();
    const handler = this.handlers.get(method);
    if (!handler) throw new ConnectError('RPC handler not found.', Code.NotFound);
    RpcAccessPolicy.authorize(handler, context.identity);
    let input: unknown;
    try {
      input = decodeJson(payload, this.config.maxPayloadBytes);
    } catch (error) {
      throw RpcFailureMapper.fromPayload(error);
    }
    const shardId =
      handler.routing === 'guild'
        ? ShardClientUtil.shardIdForGuildId(RpcGuildIdValidator.read(input), this.totalShards)
        : this.config.singletonShard;
    const shard = this.shards.get(shardId);
    if (!shard?.ready || !this.available.has(shardId))
      throw new ConnectError('RPC target shard unavailable.', Code.Unavailable);
    const remaining = Math.min(this.config.timeoutMs, context.deadline.getTime() - Date.now());
    const response = await this.request(
      shard,
      {
        rpc: RPC_IPC,
        kind: 'invoke',
        id: context.requestId,
        method,
        payload: Buffer.from(payload).toString('utf8'),
        identity: context.identity,
        deadline: context.deadline.getTime(),
      },
      remaining,
      context.signal,
    );
    if (response.kind !== 'result') throw RpcFailureMapper.ipcUnavailable();
    const bytes = Buffer.from(response.payload, 'utf8');
    try {
      decodeJson(bytes, this.config.maxPayloadBytes);
    } catch {
      throw new ConnectError('Invalid RPC shard result.', Code.Internal);
    }
    return bytes;
  }

  private request(
    shard: RpcShard,
    message: RpcIpcMessage,
    timeoutMs: number,
    signal?: AbortSignal,
  ): Promise<RpcIpcMessage> {
    if (this.stopping) return Promise.reject(RpcFailureMapper.ipcUnavailable());
    if (signal?.aborted) return Promise.reject(RpcFailureMapper.fromCancellation(signal));
    if (timeoutMs <= 0)
      return Promise.reject(new ConnectError('RPC deadline exceeded.', Code.DeadlineExceeded));
    if (this.pending.has(message.id))
      return Promise.reject(new ConnectError('Duplicate RPC request ID.', Code.AlreadyExists));
    const request = new RpcPendingRequest(shard, message, timeoutMs, signal, this.release.bind(this));
    this.pending.set(message.id, request);
    return request.start();
  }

  async close(graceMs: number): Promise<void> {
    this.stopping = true;
    const completions: Array<Promise<RpcIpcMessage>> = [];
    for (const call of this.pending.values()) completions.push(call.completion);
    await RpcCancellation.waitForSettled(completions, graceMs);
    for (const call of [...this.pending.values()])
      call.cancel(new ConnectError('RPC is shutting down.', Code.Unavailable));
    for (const listeners of this.subscriptions.splice(0)) {
      const shard = listeners.shard;
      shard.off('message', listeners.message);
      shard.off('death', listeners.unavailable);
      shard.off('disconnect', listeners.unavailable);
      shard.off('ready', listeners.ready);
    }
    this.available.clear();
    this.descriptionsInProgress.clear();
  }

  private receive(shard: RpcShard, value: unknown): void {
    if (!RpcIpcValidator.isMessage(value)) return;
    const pending = this.pending.get(value.id);
    if (pending?.shardId === shard.id) pending.finish(value);
  }

  private markUnavailable(shard: RpcShard): void {
    this.available.delete(shard.id);
    this.descriptionsInProgress.delete(shard.id);
    for (const call of [...this.pending.values()])
      if (call.shardId === shard.id) call.cancel(RpcFailureMapper.ipcUnavailable());
  }

  private refresh(shard: RpcShard): void {
    void this.describe(shard).catch(() => undefined);
  }

  private release(id: string): void {
    this.pending.delete(id);
  }

  private canonical(entries: Array<RpcHandlerDescription>): string {
    const normalized: Array<RpcHandlerDescription> = [];
    entries.sort(this.compareHandlers);
    for (const entry of entries) {
      normalized.push({
        name: entry.name,
        routing: entry.routing,
        permissions: [...entry.permissions].sort(),
        allowAuthenticated: entry.allowAuthenticated,
      });
    }
    return JSON.stringify(normalized);
  }

  private compareHandlers(left: RpcHandlerDescription, right: RpcHandlerDescription): number {
    return left.name.localeCompare(right.name);
  }
}
