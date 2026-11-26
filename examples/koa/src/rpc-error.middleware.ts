import { Code, RpcClientError } from '@spraxium/rpc-client';
import type { Middleware } from 'koa';

/** Returns safe HTTP errors for failed bot calls and leaves other errors to Koa. */
export const rpcErrorMiddleware: Middleware = async (context, next) => {
  try {
    await next();
  } catch (error) {
    if (!(error instanceof RpcClientError)) throw error;
    if (error.code === Code.InvalidArgument) {
      context.status = 400;
      context.body = { error: 'Invalid guild ID' };
      return;
    }
    if (error.code === Code.NotFound) {
      context.status = 404;
      context.body = { error: 'Guild not found' };
      return;
    }
    context.status = 503;
    context.body = { error: 'Bot unavailable' };
  }
};
