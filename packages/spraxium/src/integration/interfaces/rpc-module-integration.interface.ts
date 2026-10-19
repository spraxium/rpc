import type { RpcApplicationLifecycle } from './rpc-application-lifecycle.interface';
import type { RpcModuleContext } from './rpc-module-context.interface';

export interface RpcModuleIntegration {
  name: string;
  setup(context: RpcModuleContext): RpcApplicationLifecycle;
}
