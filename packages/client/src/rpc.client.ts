import { Code, ConnectError } from '@connectrpc/connect';
import { decodeJson, encodeJson, type RpcMethodContract } from '@spraxium/rpc-protocol';
import type { ResolvedRpcClientOptions } from './interfaces/resolved-rpc-client-options.interface';
import type { RpcCallOptions } from './interfaces/rpc-call-options.interface';
import type { RpcClient } from './interfaces/rpc-client.interface';
import type { RpcGatewayConnection } from './interfaces/rpc-gateway-connection.interface';

export class NodeRpcClient<
  Contract extends {
    [Method in keyof Contract]: RpcMethodContract;
  },
> implements RpcClient<Contract>
{
  private readonly pending = new Set<AbortController>();
  private closed = false;

  constructor(
    private readonly options: ResolvedRpcClientOptions,
    private readonly connection: RpcGatewayConnection,
  ) {
    this.call = this.call.bind(this);
    this.close = this.close.bind(this);
  }

  call<Method extends keyof Contract & string>(
    method: Method,
    input: Contract[Method]['input'],
    options?: RpcCallOptions,
  ): Promise<Contract[Method]['output']>;
  async call(
    method: keyof Contract & string,
    input: unknown,
    options: RpcCallOptions = {},
  ): Promise<unknown> {
    this.validateCall(method, options);
    const payload = this.encodeInput(input);
    const controller = new AbortController();
    this.pending.add(controller);

    try {
      const response = await this.connection.invoke(method, payload, {
        timeoutMs: options.timeoutMs,
        signal: options.signal ? AbortSignal.any([controller.signal, options.signal]) : controller.signal,
      });
      return decodeJson(response, this.options.maxPayloadBytes);
    } catch (error) {
      if (error instanceof ConnectError) throw error;
      throw new ConnectError('Invalid RPC response.', Code.DataLoss);
    } finally {
      this.pending.delete(controller);
    }
  }

  close(): void {
    if (this.closed) return;
    this.closed = true;
    for (const controller of this.pending) controller.abort();
    this.pending.clear();
    this.connection.close();
  }

  private validateCall(method: string, options: RpcCallOptions): void {
    if (this.closed) throw new ConnectError('RPC client is closed.', Code.Unavailable);
    if (options.signal?.aborted) throw new ConnectError('RPC call canceled.', Code.Canceled);
    if (typeof method !== 'string' || !/^[a-zA-Z][a-zA-Z0-9._-]{0,127}$/.test(method))
      throw new ConnectError('Invalid RPC method name.', Code.InvalidArgument);
    if (
      options.timeoutMs !== undefined &&
      (!Number.isSafeInteger(options.timeoutMs) || options.timeoutMs <= 0 || options.timeoutMs > 2147483647)
    ) {
      throw new ConnectError('Invalid RPC timeout.', Code.InvalidArgument);
    }
  }

  private encodeInput(input: unknown): Uint8Array {
    try {
      return encodeJson(input, this.options.maxPayloadBytes);
    } catch (error) {
      throw new ConnectError(
        error instanceof RangeError ? 'RPC payload limit exceeded.' : 'Invalid JSON input.',
        error instanceof RangeError ? Code.ResourceExhausted : Code.InvalidArgument,
      );
    }
  }
}
