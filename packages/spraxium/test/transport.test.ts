import { Code, ConnectError, createClient } from '@connectrpc/connect';
import { createConnectTransport, Http2SessionManager } from '@connectrpc/connect-node';
import { logger } from '@spraxium/logger';
import { createRpcClient } from '@spraxium/rpc-client';
import { RpcGateway } from '@spraxium/rpc-protocol';
import type { RpcContext } from '@spraxium/rpc-server';
import { RpcError } from '@spraxium/rpc-server';
import type { RpcDispatcher } from '@spraxium/rpc-server/runtime';
import { RpcExecutor } from '@spraxium/rpc-server/runtime';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { RpcConfig } from '../src/configuration/interfaces/rpc-config.interface';
import { RpcHandler } from '../src/handlers/rpc-handler.decorator';
import { RpcRegistry } from '../src/handlers/rpc-handler.registry';
import { RpcRuntimeComposition } from '../src/integration/rpc-runtime.composition';
import { config, deferred, token } from './helpers';

const cleanup: Array<() => void | Promise<void>> = [];

afterEach(async () => {
  for (const close of cleanup.splice(0).reverse()) await close();
});

async function start(instance: object, overrides: Partial<RpcConfig> = {}) {
  const registry = new RpcRegistry();
  registry.scan(instance);
  const options = config(overrides);
  const server = RpcRuntimeComposition.createServer(options, new RpcExecutor(registry, options));
  await server.start();
  cleanup.push(() => server.close());
  const url = server.address;
  if (!url) throw new Error('Missing listener address.');

  const client = createRpcClient({ url, token });
  cleanup.push(() => client.close());

  return { server, client, url };
}

class TestHandlers {
  @RpcHandler('safe.failure', { routing: 'singleton', allowAuthenticated: true })
  safeFailure() {
    throw new RpcError('Guild not found.', Code.NotFound);
  }

  @RpcHandler('unsafe.failure', { routing: 'singleton', allowAuthenticated: true })
  unsafeFailure() {
    throw new ConnectError('database secret', Code.Internal);
  }

  @RpcHandler('echo', { routing: 'singleton', permissions: ['guild:read'] })
  echo(input: unknown) {
    return input;
  }

  @RpcHandler('guild.stats', {
    routing: 'guild',
    permissions: ['guild:read'],
    schema: {
      parse(input: unknown) {
        if (!input || typeof input !== 'object' || !('guildId' in input))
          throw new Error('secret validation details');

        return input;
      },
    },
  })
  stats(input: { guildId: string }) {
    return { guildId: input.guildId, members: 42, premium: false };
  }

  @RpcHandler('validated', {
    routing: 'singleton',
    allowAuthenticated: true,
    schema: {
      parse(input) {
        if (typeof input !== 'number') throw new Error('sensitive data');
        return input;
      },
    },
  })
  validated(input: number) {
    return input * 2;
  }

  @RpcHandler('failure', { routing: 'singleton', allowAuthenticated: true })
  failure() {
    throw new Error('secret database password');
  }

  @RpcHandler('invalid.output', { routing: 'singleton', allowAuthenticated: true })
  invalid() {
    return { invalid: 1n };
  }

  @RpcHandler('empty', { routing: 'singleton', allowAuthenticated: true })
  empty() {
    return null;
  }
}

describe('Connect and gRPC transport integration', () => {
  it('logs only registered method names and never copies arbitrary request strings or tokens into logs', async () => {
    const child = logger.child('test-rpc');
    const info = vi.spyOn(child, 'info').mockImplementation(() => {});
    const factory = vi.spyOn(logger, 'child').mockReturnValue(child);

    try {
      const { client } = await start(new TestHandlers());

      await expect(client.call(token, null)).rejects.toMatchObject({ code: Code.NotFound });

      const logs = info.mock.calls.map(([message]) => message).join('\n');

      expect(logs).not.toContain(token);
      expect(logs).toContain('method=<unregistered>');
      expect(logs).toContain('requestId=');
    } finally {
      factory.mockRestore();
      info.mockRestore();
    }
  });

  it('preserves detached client methods when using the class implementation', async () => {
    const { client } = await start(new TestHandlers());
    const { call, close } = client;

    await expect(call('echo', { nested: { value: true } })).resolves.toEqual({ nested: { value: true } });

    close();
    close();

    await expect(call('echo', null)).rejects.toMatchObject({ code: Code.Unavailable });
  });

  it('round-trips structured payloads and legitimate null with typed external contracts', async () => {
    const { url, client } = await start(new TestHandlers());
    const payload = { nested: [null, true, 12, 'Olá'], object: { key: 'value' } };

    expect(await client.call('echo', payload)).toEqual(payload);
    expect(await client.call('empty', null)).toBeNull();

    interface Contract {
      'guild.stats': {
        input: {
          guildId: string;
        };
        output: {
          members: number;
          premium: boolean;
        };
      };
    }

    const typed = createRpcClient<Contract>({ url, token });
    cleanup.push(() => typed.close());

    expect((await typed.call('guild.stats', { guildId: '123456789012345678' })).members).toBe(42);
  });

  it('accepts real gRPC wire calls through the same versioned gateway', async () => {
    const { url } = await start(new TestHandlers());
    const client = createRpcClient({ url, token, protocol: 'grpc' });
    cleanup.push(() => client.close());

    expect(await client.call('echo', { grpc: true })).toEqual({ grpc: true });
  });

  it('handles concurrent requests independently', async () => {
    const { client } = await start(new TestHandlers());

    expect(await Promise.all(Array.from({ length: 20 }, (_, index) => client.call('echo', index)))).toEqual(
      Array.from({ length: 20 }, (_, index) => index),
    );
  });

  it('rejects missing and invalid tokens and never grants client-supplied permissions', async () => {
    const { url } = await start(new TestHandlers());
    const sessionManager = new Http2SessionManager(url);
    cleanup.push(() => sessionManager.abort());
    const raw = createClient(
      RpcGateway,
      createConnectTransport({ baseUrl: url, httpVersion: '2', sessionManager }),
    );

    await expect(raw.invoke({ method: 'echo', payloadJson: Buffer.from('null') })).rejects.toMatchObject({
      code: Code.Unauthenticated,
    });

    const bad = createRpcClient({ url, token: 'invalid' });
    cleanup.push(() => bad.close());

    await expect(bad.call('echo', null)).rejects.toMatchObject({ code: Code.Unauthenticated });

    const limited = createRpcClient({ url, token: `${token}-limited` });
    cleanup.push(() => limited.close());

    await expect(limited.call('echo', { permissions: ['guild:read'] })).rejects.toMatchObject({
      code: Code.PermissionDenied,
    });
    expect(await limited.call('empty', null)).toBeNull();
  });

  it('maps unknown methods, invalid arguments, serialization and safe internal errors', async () => {
    const { client } = await start(new TestHandlers());

    await expect(client.call('safe.failure', null)).rejects.toMatchObject({
      code: Code.NotFound,
      rawMessage: 'Guild not found.',
    });
    await expect(client.call('unsafe.failure', null)).rejects.toMatchObject({
      code: Code.Internal,
      rawMessage: 'RPC handler failed.',
    });
    await expect(client.call('unregistered', null)).rejects.toMatchObject({ code: Code.NotFound });
    await expect(client.call('guild.stats', { guildId: 'not-a-snowflake' })).rejects.toMatchObject({
      code: Code.InvalidArgument,
    });
    await expect(client.call('validated', 'wrong')).rejects.toMatchObject({
      code: Code.InvalidArgument,
      rawMessage: 'Invalid RPC arguments.',
    });
    await expect(client.call('failure', null)).rejects.toMatchObject({
      code: Code.Internal,
      rawMessage: 'RPC handler failed.',
    });
    await expect(client.call('invalid.output', null)).rejects.toMatchObject({ code: Code.Internal });
    await expect(client.call('echo', undefined)).rejects.toMatchObject({ code: Code.InvalidArgument });
  });

  it('rejects malformed UTF-8, JSON and oversized payloads before executing handlers', async () => {
    const { url, client } = await start(new TestHandlers(), { maxPayloadBytes: 32 });

    await expect(client.call('echo', 'x'.repeat(100))).rejects.toMatchObject({
      code: Code.ResourceExhausted,
    });

    const sessionManager = new Http2SessionManager(url);
    cleanup.push(() => sessionManager.abort());
    const raw = createClient(
      RpcGateway,
      createConnectTransport({ baseUrl: url, httpVersion: '2', sessionManager }),
    );

    for (const payloadJson of [Buffer.from('{'), new Uint8Array([0xff])]) {
      await expect(
        raw.invoke({ method: 'echo', payloadJson }, { headers: { authorization: `Bearer ${token}` } }),
      ).rejects.toMatchObject({ code: Code.InvalidArgument });
    }
  });

  it('releases the invocation slot after schema validation fails', async () => {
    const { client } = await start(new TestHandlers(), { maxConcurrentCalls: 1 });

    await expect(client.call('validated', 'invalid')).rejects.toMatchObject({ code: Code.InvalidArgument });
    await expect(client.call('echo', { recovered: true })).resolves.toEqual({ recovered: true });
  });

  it('enforces per-credential fixed-window rate limits', async () => {
    const { client } = await start(new TestHandlers(), { rateLimit: { maxRequests: 1, windowMs: 60000 } });
    await client.call('echo', null);

    await expect(client.call('echo', null)).rejects.toMatchObject({ code: Code.ResourceExhausted });
  });

  it('propagates cancellation and keeps a concurrency slot until an ignoring handler finishes', async () => {
    const entered = deferred<void>();
    const release = deferred<null>();
    let context: RpcContext | undefined;

    class Slow {
      @RpcHandler('slow', { routing: 'singleton', allowAuthenticated: true })
      async slow(_input: unknown, current: RpcContext) {
        context = current;
        entered.resolve();

        return release.promise;
      }
    }

    const { client } = await start(new Slow(), { maxConcurrentCalls: 1 });
    const controller = new AbortController();
    const pending = client.call('slow', null, { signal: controller.signal });
    await entered.promise;
    controller.abort();

    await expect(pending).rejects.toMatchObject({ code: Code.Canceled });
    await expect(client.call('slow', null)).rejects.toMatchObject({ code: Code.ResourceExhausted });
    expect(context?.signal.aborted).toBe(true);

    release.resolve(null);
  });

  it('enforces the server deadline even when a handler ignores its signal', async () => {
    const release = deferred<null>();

    class Slow {
      @RpcHandler('slow', { routing: 'singleton', allowAuthenticated: true })
      slow() {
        return release.promise;
      }
    }

    const { client } = await start(new Slow(), { timeoutMs: 50 });

    await expect(client.call('slow', null)).rejects.toMatchObject({
      code: Code.DeadlineExceeded,
    });

    release.resolve(null);
  });

  it('skips response validation and serialization after a call is canceled', async () => {
    const entered = deferred<void>();
    const release = deferred<null>();
    const canceled = deferred<void>();
    let validations = 0;

    class Slow {
      @RpcHandler('slow', {
        routing: 'singleton',
        allowAuthenticated: true,
        responseSchema: {
          parse(value: unknown) {
            validations++;
            return value;
          },
        },
      })
      slow(_input: unknown, context: RpcContext) {
        context.signal.addEventListener('abort', () => canceled.resolve(), { once: true });
        entered.resolve();

        return release.promise;
      }
    }

    const { client, server } = await start(new Slow());
    const controller = new AbortController();
    const pending = client.call('slow', null, { signal: controller.signal });
    await entered.promise;
    controller.abort();

    await expect(pending).rejects.toMatchObject({ code: Code.Canceled });

    await canceled.promise;
    release.resolve(null);
    await server.close();

    expect(validations).toBe(0);
  });

  it('shuts down pending calls within the grace period and closes listeners', async () => {
    const entered = deferred<void>();
    const release = deferred<null>();

    class Slow {
      @RpcHandler('slow', { routing: 'singleton', allowAuthenticated: true })
      slow() {
        entered.resolve();
        return release.promise;
      }
    }

    const { client, server } = await start(new Slow(), { shutdownGraceMs: 20 });
    const pending = client.call('slow', null).catch((error: unknown) => error);
    await entered.promise;
    await server.close();

    expect(await pending).toMatchObject({ code: Code.Unavailable });

    release.resolve(null);

    await expect(client.call('slow', null)).rejects.toMatchObject({ code: Code.Unavailable });
  });

  it('validates and transforms responses before returning them to callers', async () => {
    class Responses {
      @RpcHandler('valid', {
        routing: 'singleton',
        allowAuthenticated: true,
        responseSchema: {
          parse(value: unknown) {
            if (!value || typeof value !== 'object' || !('count' in value) || typeof value.count !== 'number')
              throw new Error('Private schema detail');

            return { count: value.count };
          },
        },
      })
      valid() {
        return { count: 42, secret: 'private' };
      }

      @RpcHandler('invalid', {
        routing: 'singleton',
        allowAuthenticated: true,
        responseSchema: {
          parse() {
            throw new Error('Private schema detail');
          },
        },
      })
      invalid() {
        return null;
      }
    }

    const { client } = await start(new Responses());

    await expect(client.call('valid', null)).resolves.toEqual({ count: 42 });
    await expect(client.call('invalid', null)).rejects.toMatchObject({
      code: Code.Internal,
      rawMessage: 'Invalid RPC result.',
    });
    await expect(client.call('valid', null)).resolves.toEqual({ count: 42 });
  });

  it('rejects asynchronous schemas without invoking handlers or leaking rejected promises', async () => {
    let calls = 0;

    class AsyncSchemas {
      @RpcHandler('async.input', {
        routing: 'singleton',
        allowAuthenticated: true,
        schema: {
          parse() {
            return Promise.reject(new Error('Private schema detail'));
          },
        },
      })
      input() {
        calls++;
        return null;
      }

      @RpcHandler('async.output', {
        routing: 'singleton',
        allowAuthenticated: true,
        responseSchema: {
          parse() {
            return Promise.resolve(null);
          },
        },
      })
      output() {
        return null;
      }
    }

    const { client } = await start(new AsyncSchemas());

    for (const method of ['async.input', 'async.output'])
      await expect(client.call(method, null)).rejects.toMatchObject({
        code: Code.Internal,
        rawMessage: 'RPC schemas must be synchronous.',
      });

    expect(calls).toBe(0);
  });

  it('closes network sessions even when dispatcher shutdown fails', async () => {
    const dispatcher: RpcDispatcher = {
      descriptions: () => [],
      invoke: async () => {
        throw new ConnectError('RPC handler not found.', Code.NotFound);
      },
      close: async () => {
        throw new Error('Dispatcher shutdown failed');
      },
    };
    const server = RpcRuntimeComposition.createServer(config(), dispatcher);
    await server.start();

    if (!server.address) throw new Error('Missing listener address');

    const client = createRpcClient({ url: server.address, token });

    try {
      await expect(client.call('missing', null)).rejects.toMatchObject({ code: Code.NotFound });
      await expect(server.close()).rejects.toThrow('Dispatcher shutdown failed');
      expect(server.address).toBeUndefined();
    } finally {
      client.close();
      await server.close().catch(() => undefined);
    }
  });
});
