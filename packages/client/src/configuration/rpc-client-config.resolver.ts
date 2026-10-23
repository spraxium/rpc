import { DEFAULT_MAX_PAYLOAD_BYTES } from '@spraxium/rpc-protocol';
import type { ResolvedRpcClientOptions } from '../interfaces/resolved-rpc-client-options.interface';
import type { RpcClientOptions } from '../interfaces/rpc-client-options.interface';

export class RpcClientConfigResolver {
  resolve(options: RpcClientOptions): ResolvedRpcClientOptions {
    if (options.allowInsecure !== undefined && typeof options.allowInsecure !== 'boolean')
      throw new Error('RPC allowInsecure must be a boolean.');
    const url = new URL(options.url);
    if (
      !['https:', 'http:'].includes(url.protocol) ||
      url.username ||
      url.password ||
      url.search ||
      url.hash
    ) {
      throw new Error('Invalid RPC URL.');
    }

    if (
      url.protocol === 'http:' &&
      !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) &&
      !options.allowInsecure
    ) {
      throw new Error(
        'Remote RPC connections require TLS or explicit allowInsecure for a private proxy network.',
      );
    }

    if (
      typeof options.token !== 'string' ||
      !options.token ||
      options.token.length > 4096 ||
      !/^[\x21-\x7E]+$/.test(options.token)
    ) {
      throw new Error('RPC token must contain 1-4096 printable ASCII characters without whitespace.');
    }

    const resolved = {
      ...options,
      url: url.href,
      maxPayloadBytes: options.maxPayloadBytes ?? DEFAULT_MAX_PAYLOAD_BYTES,
      timeoutMs: options.timeoutMs ?? 10000,
    };

    for (const value of [resolved.maxPayloadBytes, resolved.timeoutMs]) {
      if (!Number.isSafeInteger(value) || value <= 0 || value > 2147483647) {
        throw new Error('RPC limits must be positive integers no greater than 2147483647.');
      }
    }

    if (options.protocol === 'grpc' && options.httpVersion === '1.1')
      throw new Error('gRPC requires HTTP/2.');
    if (options.protocol !== undefined && options.protocol !== 'connect' && options.protocol !== 'grpc')
      throw new Error('RPC protocol must be connect or grpc.');
    if (options.httpVersion !== undefined && options.httpVersion !== '2' && options.httpVersion !== '1.1')
      throw new Error('RPC HTTP version must be 2 or 1.1.');

    return resolved;
  }
}
