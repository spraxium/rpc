import type { RpcShard } from './rpc-shard.interface';

export interface RpcShardListeners {
  shard: RpcShard;
  message(value: unknown): void;
  unavailable(): void;
  ready(): void;
}
