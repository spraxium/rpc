import type { RpcMethodContract } from '@spraxium/rpc-protocol';
import type { RpcCallOptions } from './rpc-call-options.interface';

export interface RpcClient<
  Contract extends {
    [Method in keyof Contract]: RpcMethodContract;
  },
> {
  /**
   * Calls a named handler and returns its decoded JSON result.
   * @param method The name registered on the destination gateway.
   * @param input JSON data expected by the handler.
   * @param options A per-call timeout or cancellation signal.
   * @throws RpcClientError if the call fails, expires or is canceled.
   */
  call<Method extends keyof Contract & string>(
    method: Method,
    input: Contract[Method]['input'],
    options?: RpcCallOptions,
  ): Promise<Contract[Method]['output']>;

  /** Cancels pending calls and releases connections. It is safe to call more than once. */
  close(): void;
}
