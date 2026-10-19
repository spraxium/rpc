import { Code, ConnectError } from '@connectrpc/connect';
import { decodeJson } from '@spraxium/rpc-protocol';
import type { ResolvedRpcConfig } from '../configuration/interfaces/resolved-rpc-config.interface';
import { RpcGuildIdValidator } from '../handlers/rpc-guild-id.validator';
import type { RpcRegistry } from '../handlers/rpc-handler.registry';
import type { RpcContext } from '../interfaces/rpc-context.interface';
import { RpcAccessPolicy } from '../security/rpc-access.policy';
import type { RpcDispatcher } from './interfaces/rpc-dispatcher.interface';
import { RpcCancellation } from './rpc-cancellation.service';
import { RpcFailureMapper } from './rpc-failure.mapper';
import { RpcInvocation } from './rpc.invocation';

export class RpcExecutor implements RpcDispatcher {
  private stopping = false;
  private readonly active = new Map<Promise<Uint8Array>, RpcInvocation>();

  constructor(
    private readonly registry: RpcRegistry,
    private readonly config: ResolvedRpcConfig,
  ) {}

  descriptions() {
    return this.registry.descriptions();
  }

  async invoke(method: string, payload: Uint8Array, context: RpcContext): Promise<Uint8Array> {
    if (this.stopping) throw new ConnectError('RPC is shutting down.', Code.Unavailable);
    if (this.active.size >= this.config.maxConcurrentCalls)
      throw new ConnectError('RPC concurrency limit exceeded.', Code.ResourceExhausted);
    const handler = this.registry.get(method);
    RpcAccessPolicy.authorize(handler, context.identity);
    const input = this.decodeInput(payload);
    const guildId = handler.routing === 'guild' ? RpcGuildIdValidator.read(input) : undefined;
    const invocation = new RpcInvocation(handler, input, context, this.config, guildId);
    const execution = invocation.run();
    this.active.set(execution, invocation);
    void execution.finally(() => this.release(execution, invocation)).catch(() => undefined);
    return RpcCancellation.wait(execution, invocation.controller.signal);
  }

  async close(graceMs: number): Promise<void> {
    this.stopping = true;
    await RpcCancellation.waitForSettled(this.active.keys(), graceMs);
    for (const invocation of this.active.values())
      invocation.controller.abort(new ConnectError('RPC is shutting down.', Code.Unavailable));
    this.active.clear();
  }

  private decodeInput(payload: Uint8Array): unknown {
    try {
      return decodeJson(payload, this.config.maxPayloadBytes);
    } catch (error) {
      throw RpcFailureMapper.fromPayload(error);
    }
  }

  private release(execution: Promise<Uint8Array>, invocation: RpcInvocation): void {
    this.active.delete(execution);
    invocation.dispose();
  }
}
