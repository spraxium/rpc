import { ConfigStore, ParentHookRegistry } from '@spraxium/core';
import { describe, expect, it, vi } from 'vitest';
import { defineRpc } from '../src/configuration/rpc.config';
import { RpcConfigResolver } from '../src/configuration/rpc-config.resolver';
import { RpcRegistry } from '../src/handlers/rpc-handler.registry';
import { RpcLifecycle } from '../src/integration/rpc.lifecycle';
import { SpraxiumRpcHost } from '../src/integration/spraxium-rpc.host';
import { RpcServer } from '../src/transport/rpc.server';
import { config, token } from './helpers';

describe('secure configuration', () => {
  it('does not start a listener when configuration is absent or explicitly disabled', async () => {
    const start = vi.spyOn(RpcServer.prototype, 'start');
    const shutdown = vi.fn();
    const restore = Object.getOwnPropertyDescriptor(ParentHookRegistry, 'onShutdown');
    Object.defineProperty(ParentHookRegistry, 'onShutdown', { value: shutdown, configurable: true });

    try {
      for (const plugins of [[], [defineRpc({ enabled: false, auth: { tokens: [] } })]]) {
        ConfigStore.load({ plugins });
        const lifecycle = new RpcLifecycle(new SpraxiumRpcHost(), new RpcRegistry(), new RpcConfigResolver());
        lifecycle.onBoot();
        await lifecycle.onApplicationReady();
        await lifecycle.onShutdown();
      }

      expect(start).not.toHaveBeenCalled();
    } finally {
      start.mockRestore();
      ConfigStore.reset();

      if (restore) Object.defineProperty(ParentHookRegistry, 'onShutdown', restore);
      else Reflect.deleteProperty(ParentHookRegistry, 'onShutdown');
    }
  });

  it('rejects a framework without the required integration capabilities', () => {
    if (!('onShutdown' in ParentHookRegistry)) {
      expect(() => new SpraxiumRpcHost().assertCompatible()).toThrow('framework packages starting at 0.10.0');
    }
  });

  it('uses loopback and bounded operational defaults', () => {
    expect(config()).toMatchObject({
      host: '127.0.0.1',
      timeoutMs: 10000,
      maxConcurrentCalls: 100,
      singletonShard: 0,
    });
  });

  it('requires valid mandatory credentials and limits before opening a listener', () => {
    expect(() => config({ auth: { tokens: [] } })).toThrow('access token');
    expect(() => config({ auth: { tokens: [{ id: 'api', value: 'short', permissions: [] }] } })).toThrow(
      '32',
    );
    expect(() =>
      config({
        auth: {
          tokens: [
            { id: 'api', value: token, permissions: [] },
            { id: 'api', value: `${token}2`, permissions: [] },
          ],
        },
      }),
    ).toThrow('unique');
    expect(() => config({ timeoutMs: 0 })).toThrow('positive');
    expect(() => config({ port: 65536 })).toThrow('port');
  });

  it('requires explicit TLS or proxy trust for externally reachable addresses', () => {
    expect(() => config({ host: '0.0.0.0' })).toThrow('TLS');
    expect(config({ host: '0.0.0.0', tlsTerminationProxy: true }).host).toBe('0.0.0.0');
  });

  it('supports a single token with explicit permissions and bounded defaults', () => {
    const resolver = new RpcConfigResolver();

    expect(resolver.resolve({ token, permissions: ['guild:read'] })).toMatchObject({
      enabled: true,
      host: '127.0.0.1',
      auth: { tokens: [{ id: 'default', value: token, permissions: ['guild:read'] }] },
    });
    expect(resolver.resolve({ token }).auth.tokens[0].permissions).toEqual([]);
    expect(() => resolver.resolve({ token, auth: { tokens: [] } })).toThrow('not both');
    expect(() => resolver.resolve({ token: 'x'.repeat(4097) })).toThrow('4096');
    expect(() => resolver.resolve({ token: 'é'.repeat(32) })).toThrow('ASCII');
    expect(() =>
      Reflect.apply(resolver.resolve, resolver, [{ token, tlsTerminationProxy: 'false' }]),
    ).toThrow('booleans');
  });
});
