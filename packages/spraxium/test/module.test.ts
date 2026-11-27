import 'reflect-metadata';
import { SpraxiumContainer } from '@spraxium/core';
import { RpcServer } from '@spraxium/rpc-server/runtime';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { RpcConfigResolver } from '../src/configuration/rpc-config.resolver';
import { RpcHandler } from '../src/handlers/rpc-handler.decorator';
import { RpcRegistry } from '../src/handlers/rpc-handler.registry';
import type { RpcFrameworkHost } from '../src/integration/interfaces/rpc-framework-host.interface';
import { RpcLifecycle } from '../src/integration/rpc.lifecycle';
import { RpcModuleLifecycle } from '../src/integration/rpc-module.lifecycle';
import { config } from './helpers';

class FeatureHandler {
  value = 1;

  @RpcHandler('feature.value', { routing: 'singleton', allowAuthenticated: true })
  read() {
    return this.value;
  }
}

afterEach(() => vi.restoreAllMocks());

describe('native RPC module lifecycle', () => {
  it('discovers providers created before RpcModule and keeps the original DI instance', () => {
    const container = new SpraxiumContainer();
    const module = new RpcModuleLifecycle(container);
    const handler = new FeatureHandler();
    module.onInstance(handler);
    const registry = new RpcRegistry();
    container.set(RpcRegistry, registry);
    module.onBoot();
    handler.value = 42;

    expect(
      registry.get('feature.value').execute(null, {
        identity: { id: 'test', permissions: [] },
        requestId: 'module-test',
        deadline: new Date(Date.now() + 1000),
        signal: new AbortController().signal,
      }),
    ).toBe(42);
  });

  it('keeps handler discovery scoped to each application', () => {
    const registries: Array<RpcRegistry> = [];

    for (const value of [1, 2]) {
      const container = new SpraxiumContainer();
      const registry = new RpcRegistry();
      const module = new RpcModuleLifecycle(container);
      const handler = new FeatureHandler();
      handler.value = value;
      container.set(RpcRegistry, registry);
      module.onInstance(handler);
      module.onBoot();
      registries.push(registry);
    }

    expect(registries[0].get('feature.value')).not.toBe(registries[1].get('feature.value'));
    expect(registries[0].descriptions()).toHaveLength(1);
    expect(registries[1].descriptions()).toHaveLength(1);
  });

  it('waits for application readiness and drains once across both shutdown phases', async () => {
    const start = vi.spyOn(RpcServer.prototype, 'start').mockResolvedValue();
    const close = vi.spyOn(RpcServer.prototype, 'close').mockResolvedValue();
    const host: RpcFrameworkHost = {
      configuration: () => config(),
      isShardChild: () => false,
      assertCompatible: vi.fn(),
      registerParent: vi.fn(),
      onShutdown: vi.fn(),
    };
    const registry = new RpcRegistry();
    const lifecycle = new RpcLifecycle(host, registry, new RpcConfigResolver());
    const container = new SpraxiumContainer();
    container.set(RpcRegistry, registry);
    container.set(RpcLifecycle, lifecycle);
    const module = new RpcModuleLifecycle(container);
    module.onBoot();
    lifecycle.onBoot();

    expect(start).not.toHaveBeenCalled();

    await module.onApplicationReady();

    expect(start).toHaveBeenCalledOnce();

    await module.onShutdown();
    await lifecycle.onShutdown();

    expect(close).toHaveBeenCalledOnce();

    await module.onApplicationReady();

    expect(start).toHaveBeenCalledOnce();
  });
});
