import process from 'node:process';
import { RpcFailureMapper } from '../execution/rpc-failure.mapper';
import type { RpcIpcPeer } from './interfaces/rpc-ipc-peer.interface';
import type { RpcIpcMessage } from './types/rpc-ipc-message.type';

export class ProcessIpcPeer implements RpcIpcPeer {
  on(event: 'message', listener: (message: unknown) => void): unknown {
    return process.on(event, listener);
  }

  off(event: 'message', listener: (message: unknown) => void): unknown {
    return process.off(event, listener);
  }

  send(message: RpcIpcMessage): Promise<unknown> {
    return new Promise<void>((resolve, reject) => {
      if (!process.send || !process.connected) {
        reject(RpcFailureMapper.ipcUnavailable());
        return;
      }

      process.send(message, (error) => {
        if (error) reject(RpcFailureMapper.ipcUnavailable());
        else resolve();
      });
    });
  }
}
