import type { RpcClient } from '@spraxium/rpc-client';
import type { BotRpcContract } from './bot-rpc-contract.type.ts';

export type BotRpcClient = RpcClient<BotRpcContract>;
