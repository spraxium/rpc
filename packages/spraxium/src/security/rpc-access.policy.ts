import { Code, ConnectError } from '@connectrpc/connect';
import type { RpcHandlerDescription } from '../handlers/interfaces/rpc-handler-description.interface';
import type { RpcIdentity } from '../interfaces/rpc-identity.interface';

export class RpcAccessPolicy {
  static authorize(handler: RpcHandlerDescription, identity: RpcIdentity): void {
    if (!handler.allowAuthenticated && !handler.permissions.length)
      throw new ConnectError('Permission denied.', Code.PermissionDenied);

    for (const permission of handler.permissions) {
      if (!identity.permissions.includes(permission))
        throw new ConnectError('Permission denied.', Code.PermissionDenied);
    }
  }
}
