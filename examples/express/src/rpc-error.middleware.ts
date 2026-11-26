import { Code, RpcClientError } from '@spraxium/rpc-client';
import type { NextFunction, Request, Response } from 'express';

/** Maps a rejected bot call to the dashboard's HTTP response. */
export function rpcErrorMiddleware(
  error: unknown,
  _request: Request,
  response: Response,
  next: NextFunction,
) {
  if (response.headersSent || !(error instanceof RpcClientError)) return next(error);
  if (error.code === Code.InvalidArgument) return response.status(400).json({ error: 'Invalid guild ID' });
  if (error.code === Code.NotFound) return response.status(404).json({ error: 'Guild not found' });
  return response.status(503).json({ error: 'Bot unavailable' });
}
