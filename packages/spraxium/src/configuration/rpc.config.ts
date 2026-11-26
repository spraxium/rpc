import { definePlugin } from '@spraxium/core';
import type { RpcConfig } from './interfaces/rpc-config.interface';

/** Creates the RPC entry for the plugins array in a Spraxium configuration. */
export const defineRpc = definePlugin<'rpc', RpcConfig>('rpc');
