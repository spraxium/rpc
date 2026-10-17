import type { RpcMethodContract } from '@spraxium/rpc-protocol';
import type { RpcCallOptions } from './rpc-call-options.interface';
export interface RpcClient<
  Contract extends {
    [Method in keyof Contract]: RpcMethodContract;
  },
> {
  call<Method extends keyof Contract & string>(
    method: Method,
    input: Contract[Method]['input'],
    options?: RpcCallOptions,
  ): Promise<Contract[Method]['output']>;
  close(): void;
}
