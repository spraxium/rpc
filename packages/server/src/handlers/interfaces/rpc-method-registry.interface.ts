import type { RegisteredRpcMethod } from './registered-rpc-method.interface';

export interface RpcMethodRegistry<Description extends { name: string }> {
  get(method: string): RegisteredRpcMethod;
  descriptions(): Array<Description>;
}
