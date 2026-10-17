import { Code, ConnectError } from '@connectrpc/connect';
import { type RpcMethodContract, decodeJson, encodeJson } from '@spraxium/rpc-protocol';
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

  async call<Method extends keyof Contract & string>(
    method: Method,
    input: Contract[Method]['input'],
    options: RpcCallOptions = {},
  ): Promise<Contract[Method]['output']> {
    this.validateCall(options);
    const payload = this.encodeInput(input);
    const controller = new AbortController();
    this.pending.add(controller);

    try {
      const response = await this.connection.invoke(method, payload, {
        timeoutMs: options.timeoutMs,
        signal: options.signal ? AbortSignal.any([controller.signal, options.signal]) : controller.signal,
      });
      return decodeJson(response, this.options.maxPayloadBytes) as Contract[Method]['output'];
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

  private validateCall(options: RpcCallOptions): void {
    if (this.closed) throw new ConnectError('RPC client is closed.', Code.Unavailable);
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
