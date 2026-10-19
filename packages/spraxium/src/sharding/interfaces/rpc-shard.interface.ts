import type { RpcIpcPeer } from './rpc-ipc-peer.interface';

export interface RpcShard extends RpcIpcPeer {
  readonly id: number;
  readonly ready: boolean;
  on(event: 'message' | 'death' | 'disconnect' | 'ready', listener: (value?: unknown) => void): unknown;
  off(event: 'message' | 'death' | 'disconnect' | 'ready', listener: (value?: unknown) => void): unknown;
}
