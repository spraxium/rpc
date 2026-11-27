import { RpcConfigResolver } from '../configuration/rpc-config.resolver';
import type { RpcModuleIntegration } from './interfaces/rpc-module-integration.interface';
import { RpcModuleLifecycle } from './rpc-module.lifecycle';
import { RpcParentGateway } from './rpc-parent.gateway';
import { SpraxiumRpcHost } from './spraxium-rpc.host';

const host = new SpraxiumRpcHost();
const resolver = new RpcConfigResolver();
const parent = new RpcParentGateway(host, resolver);

host.registerParent(parent.start.bind(parent));

export const rpcIntegration: RpcModuleIntegration = {
  name: 'rpc',
  setup: (context) => new RpcModuleLifecycle(context.container),
};
