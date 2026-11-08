import { createRpcClient } from '@spraxium/rpc-client';
import { ExampleEnvironment } from '../../shared/environment.service.js';
import { RpcConsoleApplication } from './rpc-console.application.js';

const rpc = createRpcClient({
  url: ExampleEnvironment.required('SPRAXIUM_RPC_URL'),
  token: ExampleEnvironment.required('SPRAXIUM_RPC_TOKEN'),
  allowInsecure: process.env.SPRAXIUM_RPC_PRIVATE_NETWORK === 'true',
});
await new RpcConsoleApplication(rpc).run(process.argv[2]);
