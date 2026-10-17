import { DEFAULT_MAX_PAYLOAD_BYTES } from '@spraxium/rpc-protocol';
import type { ResolvedRpcClientOptions } from '../interfaces/resolved-rpc-client-options.interface';
import type { RpcClientOptions } from '../interfaces/rpc-client-options.interface';

export class RpcClientConfigResolver {
  resolve(options: RpcClientOptions): ResolvedRpcClientOptions {
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

    if (!options.token || /\s/.test(options.token)) {
      throw new Error('RPC token is required and must not contain whitespace.');
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

    return resolved;
  }
}
