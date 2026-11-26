import { Global, Module } from '@spraxium/common';
import { RpcConfigResolver } from './configuration/rpc-config.resolver';
import { RpcRegistry } from './handlers/rpc-handler.registry';
import { rpcIntegration } from './integration/rpc.integration';
import { RpcLifecycle } from './integration/rpc.lifecycle';
import { SpraxiumRpcHost } from './integration/spraxium-rpc.host';

const metadata = {
  providers: [RpcRegistry, RpcConfigResolver, SpraxiumRpcHost, RpcLifecycle],
  integrations: [rpcIntegration],
};

@Global()
@Module(metadata)
/** Installs RPC handler discovery and lifecycle hooks in a Spraxium application. */
export class RpcModule {}
