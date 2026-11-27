import { Code, ConnectError } from '@connectrpc/connect';
import type { RpcArgumentSchema } from '../handlers/interfaces/rpc-argument-schema.interface';

export class RpcSchemaValidator {
  static parse<Output>(schema: RpcArgumentSchema<Output>, value: unknown, response: boolean): Output {
    let parsed: Output;

    try {
      parsed = schema.parse(value);
    } catch {
      throw new ConnectError(
        response ? 'Invalid RPC result.' : 'Invalid RPC arguments.',
        response ? Code.Internal : Code.InvalidArgument,
      );
    }
    if (
      parsed !== null &&
      (typeof parsed === 'object' || typeof parsed === 'function') &&
      'then' in parsed &&
      typeof parsed.then === 'function'
    ) {
      void Promise.resolve(parsed).catch(() => undefined);
      throw new ConnectError('RPC schemas must be synchronous.', Code.Internal);
    }

    return parsed;
  }
}
