import { Injectable } from '@spraxium/common';
import { DEFAULT_MAX_PAYLOAD_BYTES } from '@spraxium/rpc-protocol';
import type { ResolvedRpcConfig } from './interfaces/resolved-rpc-config.interface';
import type { RpcAuthentication } from './interfaces/rpc-authentication.interface';
import type { RpcConfig } from './interfaces/rpc-config.interface';

@Injectable()
export class RpcConfigResolver {
  resolve(config: RpcConfig): ResolvedRpcConfig {
    const resolved: ResolvedRpcConfig = {
      host: '127.0.0.1',
      port: 4300,
      maxPayloadBytes: DEFAULT_MAX_PAYLOAD_BYTES,
      timeoutMs: 10000,
      maxConcurrentCalls: 100,
      shutdownGraceMs: 5000,
      singletonShard: 0,
      tlsTerminationProxy: false,
      rateLimit: { maxRequests: 120, windowMs: 60000 },
      ...config,
      enabled: config.enabled ?? true,
      auth: this.resolveAuthentication(config),
    };
    this.validateLimits(resolved);
    this.validateCredentials(resolved);
    this.validateTransport(resolved);

    return resolved;
  }

  private validateLimits(resolved: ResolvedRpcConfig): void {
    if (typeof resolved.enabled !== 'boolean' || typeof resolved.tlsTerminationProxy !== 'boolean')
      throw new Error('RPC enabled and tlsTerminationProxy must be booleans.');

    for (const [key, value] of Object.entries({
      maxPayloadBytes: resolved.maxPayloadBytes,
      timeoutMs: resolved.timeoutMs,
      maxConcurrentCalls: resolved.maxConcurrentCalls,
      shutdownGraceMs: resolved.shutdownGraceMs,
      maxRequests: resolved.rateLimit.maxRequests,
      windowMs: resolved.rateLimit.windowMs,
    })) {
      if (!Number.isSafeInteger(value) || value <= 0 || value > 2147483647) {
        throw new Error(`RPC ${key} must be a positive integer no greater than 2147483647.`);
      }
    }

    if (!Number.isInteger(resolved.port) || resolved.port < 0 || resolved.port > 65535) {
      throw new Error('RPC port must be between 0 and 65535.');
    }
    if (!Number.isSafeInteger(resolved.singletonShard) || resolved.singletonShard < 0) {
      throw new Error('RPC singletonShard must be a nonnegative integer.');
    }
    if (typeof resolved.host !== 'string' || !resolved.host.trim()) throw new Error('RPC host is required.');
  }

  private resolveAuthentication(config: RpcConfig): RpcAuthentication {
    if (config.auth) {
      if (config.token !== undefined || config.permissions !== undefined)
        throw new Error('RPC accepts token/permissions or auth.tokens, not both.');

      return config.auth;
    }

    if (config.token === undefined) throw new Error('RPC requires at least one access token.');

    return { tokens: [{ id: 'default', value: config.token, permissions: config.permissions ?? [] }] };
  }

  private validateCredentials(config: ResolvedRpcConfig): void {
    const ids = new Set<string>();
    const values = new Set<string>();

    if (!config.auth?.tokens?.length) throw new Error('RPC requires at least one access token.');

    for (const token of config.auth.tokens) {
      if (!token.id || ids.has(token.id) || !/^[A-Za-z0-9._-]{1,64}$/.test(token.id)) {
        throw new Error('RPC credential IDs must be unique identifiers (1-64 characters).');
      }
      if (
        typeof token.value !== 'string' ||
        token.value.length < 32 ||
        token.value.length > 4096 ||
        !/^[\x21-\x7E]+$/.test(token.value) ||
        values.has(token.value)
      ) {
        throw new Error(
          'RPC tokens must be unique and contain 32-4096 printable ASCII characters without whitespace.',
        );
      }
      if (!this.validPermissions(token.permissions)) {
        throw new Error('RPC credential permissions must be an array of nonempty strings.');
      }

      ids.add(token.id);
      values.add(token.value);
    }
  }

  private validateTransport(resolved: ResolvedRpcConfig): void {
    if (resolved.tls && (!resolved.tls.cert || !resolved.tls.key))
      throw new Error('RPC TLS requires key and cert.');
    if (
      !['127.0.0.1', '::1', 'localhost'].includes(resolved.host) &&
      !resolved.tls &&
      !resolved.tlsTerminationProxy
    ) {
      throw new Error('Remote RPC listeners require TLS or an explicit tlsTerminationProxy configuration.');
    }
  }

  private validPermissions(value: unknown): boolean {
    if (!Array.isArray(value)) return false;

    for (const permission of value) {
      if (typeof permission !== 'string' || !permission.trim()) return false;
    }

    return true;
  }
}
