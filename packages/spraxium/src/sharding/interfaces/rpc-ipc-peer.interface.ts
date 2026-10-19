import type { RpcIpcMessage } from '../types/rpc-ipc-message.type';

export interface RpcIpcPeer {
  on(event: 'message', listener: (message: unknown) => void): unknown;
  off(event: 'message', listener: (message: unknown) => void): unknown;
  send(message: RpcIpcMessage): Promise<unknown>;
}
