import type { RpcContext } from '../../interfaces/rpc-context.interface';
import type { RpcArgumentSchema } from './rpc-argument-schema.interface';

export interface RpcMethodOptions<Input, Output> {
  /** Scope required from the caller. Use allowAuthenticated for methods open to every token. */
  permissions?: ReadonlyArray<string>;
  allowAuthenticated?: boolean;
  /** Parses the JSON request and returns the input passed to the handler. */
  schema: RpcArgumentSchema<Input>;
  responseSchema?: RpcArgumentSchema<Output>;
  /** Runs the method with validated input and the caller's deadline and cancellation signal. */
  handle(input: Input, context: RpcContext): Output | Promise<Output>;
}
