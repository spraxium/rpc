import { definePlugin } from '@spraxium/core';
import type { RpcConfig } from './interfaces/rpc-config.interface';

export const defineRpc = definePlugin<'rpc', RpcConfig>('rpc');
