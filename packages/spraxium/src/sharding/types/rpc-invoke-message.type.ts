import type { RpcIpcMessage } from './rpc-ipc-message.type';

export type RpcInvokeMessage = Extract<RpcIpcMessage, { kind: 'invoke' }>;
