import type { RpcHandlerDescription } from '../handlers/interfaces/rpc-handler-description.interface';
import { RPC_IPC } from './rpc-ipc.constant';
import type { RpcIpcMessage } from './types/rpc-ipc-message.type';

export class RpcIpcValidator {
  static isMessage(value: unknown): value is RpcIpcMessage {
    if (
      !value ||
      typeof value !== 'object' ||
      !('rpc' in value) ||
      value.rpc !== RPC_IPC ||
      !('kind' in value) ||
      !('id' in value) ||
      typeof value.id !== 'string' ||
      value.id.length > 128
    )
      return false;
    switch (value.kind) {
      case 'describe':
      case 'cancel':
        return true;
      case 'invoke':
        return (
          'method' in value &&
          typeof value.method === 'string' &&
          value.method.length <= 128 &&
          'payload' in value &&
          typeof value.payload === 'string' &&
          'deadline' in value &&
          typeof value.deadline === 'number' &&
          Number.isFinite(value.deadline) &&
          'identity' in value &&
          !!value.identity &&
          typeof value.identity === 'object' &&
          'id' in value.identity &&
          typeof value.identity.id === 'string' &&
          'permissions' in value.identity &&
          RpcIpcValidator.isStringArray(value.identity.permissions)
        );
      case 'result':
        return 'payload' in value && typeof value.payload === 'string';
      case 'error':
        return (
          'message' in value &&
          typeof value.message === 'string' &&
          'code' in value &&
          typeof value.code === 'number' &&
          Number.isInteger(value.code) &&
          value.code >= 1 &&
          value.code <= 16
        );
      case 'manifest':
        return 'handlers' in value && RpcIpcValidator.isDescriptionArray(value.handlers);
      default:
        return false;
    }
  }

  private static isDescription(value: unknown): value is RpcHandlerDescription {
    return (
      !!value &&
      typeof value === 'object' &&
      'name' in value &&
      typeof value.name === 'string' &&
      'routing' in value &&
      (value.routing === 'guild' || value.routing === 'singleton') &&
      'permissions' in value &&
      RpcIpcValidator.isStringArray(value.permissions) &&
      'allowAuthenticated' in value &&
      typeof value.allowAuthenticated === 'boolean'
    );
  }

  private static isStringArray(value: unknown): value is Array<string> {
    if (!Array.isArray(value)) return false;
    for (const item of value) {
      if (typeof item !== 'string') return false;
    }
    return true;
  }

  private static isDescriptionArray(value: unknown): value is Array<RpcHandlerDescription> {
    if (!Array.isArray(value)) return false;
    for (const item of value) {
      if (!RpcIpcValidator.isDescription(item)) return false;
    }
    return true;
  }
}
