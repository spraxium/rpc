import { createRpcClient } from '@spraxium/rpc-client';
import Fastify from 'fastify';
import { ExampleEnvironment } from '../environment.service';
import type { BotRpcContract } from '../interfaces/bot-rpc-contract.interface';
import { FastifyDashboard } from './dashboard.application';

const rpc = createRpcClient<BotRpcContract>({
  url: ExampleEnvironment.required('SPRAXIUM_RPC_URL'),
  token: ExampleEnvironment.required('SPRAXIUM_RPC_TOKEN'),
  allowInsecure: process.env.SPRAXIUM_RPC_PRIVATE_NETWORK === 'true',
});
const dashboard = new FastifyDashboard(rpc, Fastify());

await dashboard.start();
process.once('SIGTERM', dashboard.close.bind(dashboard));
process.once('SIGINT', dashboard.close.bind(dashboard));
