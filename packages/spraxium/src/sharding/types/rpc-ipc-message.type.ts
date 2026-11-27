import type { Code } from '@connectrpc/connect';
import type { RpcIdentity } from '@spraxium/rpc-server';
import type { RpcHandlerDescription } from '../../handlers/interfaces/rpc-handler-description.interface';
import type { RPC_IPC } from '../rpc-ipc.constant';

export type RpcIpcMessage =
  | {
      rpc: typeof RPC_IPC;
      kind: 'describe';
      id: string;
    }
  | {
      rpc: typeof RPC_IPC;
      kind: 'cancel';
      id: string;
    }
  | {
      rpc: typeof RPC_IPC;
      kind: 'invoke';
      id: string;
      method: string;
      payload: string;
      identity: RpcIdentity;
      deadline: number;
    }
  | {
      rpc: typeof RPC_IPC;
      kind: 'result';
      id: string;
      payload: string;
    }
  | {
      rpc: typeof RPC_IPC;
      kind: 'manifest';
      id: string;
      handlers: Array<RpcHandlerDescription>;
    }
  | {
      rpc: typeof RPC_IPC;
      kind: 'error';
      id: string;
      code: Code;
      message: string;
    };
