import { createRpcClient } from '@spraxium/rpc-client';
import { ExampleEnvironment } from '../environment.service';
import type { BotRpcContract } from '../interfaces/bot-rpc-contract.interface';
import { HonoDashboard } from './dashboard.application';

const rpc = createRpcClient<BotRpcContract>({
  url: ExampleEnvironment.required('SPRAXIUM_RPC_URL'),
  token: ExampleEnvironment.required('SPRAXIUM_RPC_TOKEN'),
  allowInsecure: process.env.SPRAXIUM_RPC_PRIVATE_NETWORK === 'true',
});
const dashboard = new HonoDashboard(rpc);
dashboard.start();
process.once('SIGTERM', dashboard.close.bind(dashboard));
process.once('SIGINT', dashboard.close.bind(dashboard));
