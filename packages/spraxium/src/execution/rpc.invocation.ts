import { Code, ConnectError } from '@connectrpc/connect';
import { encodeJson } from '@spraxium/rpc-protocol';
import type { ResolvedRpcConfig } from '../configuration/interfaces/resolved-rpc-config.interface';
import type { RegisteredRpcHandler } from '../handlers/interfaces/registered-rpc-handler.interface';
import { RpcGuildIdValidator } from '../handlers/rpc-guild-id.validator';
import type { RpcContext } from '../interfaces/rpc-context.interface';
import { RpcFailureMapper } from './rpc-failure.mapper';
import { RpcSchemaValidator } from './rpc-schema.validator';
import { RpcError } from './rpc.error';

export class RpcInvocation {
  readonly controller = new AbortController();
  private readonly timer;
  private readonly cancel = this.forwardCancellation.bind(this);
  private readonly cleanup = this.dispose.bind(this);

  constructor(
    private readonly handler: RegisteredRpcHandler,
    private input: unknown,
    private readonly context: RpcContext,
    private readonly config: ResolvedRpcConfig,
    private readonly guildId: string | undefined,
  ) {
    if (context.signal.aborted) throw RpcFailureMapper.fromCancellation(context.signal);
    const remaining = Math.min(context.deadline.getTime() - Date.now(), config.timeoutMs);
    if (remaining <= 0) throw new ConnectError('RPC deadline exceeded.', Code.DeadlineExceeded);
    context.signal.addEventListener('abort', this.cancel, { once: true });
    this.timer = setTimeout(this.expire.bind(this), remaining);
    this.controller.signal.addEventListener('abort', this.cleanup, { once: true });
  }

  run(): Promise<Uint8Array> {
    return Promise.resolve().then(this.execute.bind(this));
  }

  dispose(): void {
    clearTimeout(this.timer);
    this.context.signal.removeEventListener('abort', this.cancel);
    this.controller.signal.removeEventListener('abort', this.cleanup);
  }

  private forwardCancellation(): void {
    this.controller.abort(RpcFailureMapper.fromCancellation(this.context.signal));
  }

  private expire(): void {
    this.controller.abort(new ConnectError('RPC deadline exceeded.', Code.DeadlineExceeded));
  }

  private async execute(): Promise<Uint8Array> {
    if (this.controller.signal.aborted) throw RpcFailureMapper.fromCancellation(this.controller.signal);
    this.validateArguments();
    const result = await this.executeHandler();
    if (this.controller.signal.aborted) throw RpcFailureMapper.fromCancellation(this.controller.signal);
    const output = this.handler.responseSchema
      ? RpcSchemaValidator.parse(this.handler.responseSchema, result, true)
      : result;
    try {
      return encodeJson(output, this.config.maxPayloadBytes);
    } catch (error) {
      throw new ConnectError(
        error instanceof RangeError
          ? 'RPC result exceeds the payload limit.'
          : 'RPC result is not JSON serializable.',
        error instanceof RangeError ? Code.ResourceExhausted : Code.Internal,
      );
    }
  }

  private validateArguments(): void {
    if (!this.handler.schema) return;
    this.input = RpcSchemaValidator.parse(this.handler.schema, this.input, false);
    if (this.handler.routing === 'guild' && RpcGuildIdValidator.read(this.input) !== this.guildId) {
      throw new ConnectError('RPC schema changed guildId.', Code.InvalidArgument);
    }
  }

  private async executeHandler(): Promise<unknown> {
    try {
      return await this.handler.execute(this.input, { ...this.context, signal: this.controller.signal });
    } catch (error) {
      if (this.controller.signal.aborted) throw RpcFailureMapper.fromCancellation(this.controller.signal);
      if (error instanceof RpcError) throw new ConnectError(error.message, error.code);
      throw new ConnectError('RPC handler failed.', Code.Internal);
    }
  }
}
