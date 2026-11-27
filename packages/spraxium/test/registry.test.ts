import 'reflect-metadata';
import { describe, expect, it } from 'vitest';
import { RpcHandler } from '../src/handlers/rpc-handler.decorator';
import { RpcRegistry } from '../src/handlers/rpc-handler.registry';

describe('RPC handler discovery', () => {
  it('discovers and binds decorated methods on existing provider instances', async () => {
    class GuildService {
      readonly members = 42;
    }

    class Handler {
      constructor(readonly guilds: GuildService) {}

      @RpcHandler('guild.stats', { routing: 'guild', permissions: ['guild:read'] })
      stats() {
        return { members: this.guilds.members };
      }

      @RpcHandler('status', { routing: 'singleton', allowAuthenticated: true })
      status() {
        return 'ready';
      }

      internal() {
        return 'private';
      }
    }

    const guilds = new GuildService();
    const instance = new Handler(guilds);
    const registry = new RpcRegistry();
    registry.scan(instance);

    expect(registry.descriptions().map((entry) => entry.name)).toEqual(['guild.stats', 'status']);
    expect(
      registry.get('guild.stats').execute(
        {},
        {
          requestId: 'registry-test',
          identity: { id: 'test', permissions: ['guild:read'] },
          deadline: new Date(Date.now() + 1000),
          signal: new AbortController().signal,
        },
      ),
    ).toEqual({ members: 42 });
    expect(instance.guilds).toBe(guilds);
    expect(() => registry.get('internal')).toThrow('not found');

    registry.scan(instance);

    expect(registry.descriptions()).toHaveLength(2);
  });

  it('rejects duplicate names at startup', () => {
    class First {
      @RpcHandler('duplicate', { routing: 'singleton', allowAuthenticated: true })
      call() {
        return null;
      }
    }

    const registry = new RpcRegistry();
    registry.scan(new First());

    expect(() => registry.scan(new First())).toThrow('Duplicate RPC handler: duplicate');
  });

  it('requires valid routing, names, methods and explicit access policy', () => {
    expect(() => RpcHandler('oops', { routing: 'singleton' })).toThrow('requires permissions');
    expect(() => RpcHandler('bad name', { routing: 'singleton', allowAuthenticated: true })).toThrow(
      'Invalid',
    );
    expect(() => RpcHandler('empty', { routing: 'singleton', permissions: [] })).toThrow(
      'requires permissions',
    );
    expect(() =>
      RpcHandler('field', { routing: 'singleton', allowAuthenticated: true })({}, 'field', { value: 3 }),
    ).toThrow('instance method');
  });

  it('discovers inherited methods and respects undecorated overrides', () => {
    class Base {
      @RpcHandler('base', { routing: 'singleton', allowAuthenticated: true })
      method() {
        return 1;
      }
    }

    class Inherited extends Base {}

    class Overridden extends Base {
      override method() {
        return 2;
      }
    }

    const registry = new RpcRegistry();
    registry.scan(new Inherited());

    expect(registry.descriptions()).toHaveLength(1);

    const overridden = new RpcRegistry();
    overridden.scan(new Overridden());

    expect(overridden.descriptions()).toHaveLength(0);
  });
});
