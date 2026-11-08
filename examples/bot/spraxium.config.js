import { defineConfig } from '@spraxium/core';
import { defineRpc } from '@spraxium/rpc';
import { ExampleEnvironment } from '../shared/environment.service.js';
import { ExampleRpcTls } from './src/rpc-tls.configuration.js';
export default defineConfig({
  plugins: [
    defineRpc({
      token: ExampleEnvironment.required('SPRAXIUM_RPC_TOKEN'),
      permissions: ['guild:read'],
      host: process.env.SPRAXIUM_RPC_HOST ?? '127.0.0.1',
      port: 4300,
      tls: ExampleRpcTls.fromEnvironment(),
      tlsTerminationProxy: process.env.SPRAXIUM_RPC_TLS_PROXY === 'true',
    }),
  ],
});
