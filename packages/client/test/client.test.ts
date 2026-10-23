import { decodeJson, encodeJson } from '@spraxium/rpc-protocol';
import { describe, expect, expectTypeOf, it } from 'vitest';
import { Code, createRpcClient } from '../src';

describe('client and JSON contract', () => {
  it.each([
    undefined,
    1n,
    Number.NaN,
    Number.POSITIVE_INFINITY,
    () => 1,
    Symbol('x'),
    new Date(),
    new Map(),
    { x: undefined },
    [undefined],
    Array(2),
  ])('rejects non-JSON values (%s)', (value) => {
    expect(() => encodeJson(value, 1024)).toThrow();
  });

  it('rejects cycles, getters, symbol properties and toJSON without calling them', () => {
    const sparseWithProperty = Object.assign([1, 2], { extra: 3 });
    Reflect.deleteProperty(sparseWithProperty, '1');
    expect(() => encodeJson(sparseWithProperty, 1024)).toThrow('Sparse');
    const cycle: {
      self?: object;
    } = {};
    cycle.self = cycle;
    expect(() => encodeJson(cycle, 1024)).toThrow('Circular');
    expect(() =>
      encodeJson(
        {
          get secret() {
            throw new Error('should not run');
          },
        },
        1024,
      ),
    ).toThrow('data properties');
    expect(() => encodeJson({ [Symbol('x')]: 1 }, 1024)).toThrow();
    expect(() =>
      encodeJson(
        {
          toJSON() {
            return {};
          },
        },
        1024,
      ),
    ).toThrow();
    expect(decodeJson(encodeJson({ value: null, list: [1, true, 'hello'] }, 1024), 1024)).toEqual({
      value: null,
      list: [1, true, 'hello'],
    });
  });

  it('infers the explicit shared contract without a string index signature', () => {
    interface Contract {
      'guild.stats': {
        input: {
          guildId: string;
        };
        output: {
          members: number;
        };
      };
    }
    const client = createRpcClient<Contract>({ url: 'http://127.0.0.1:1', token: 'test' });
    expectTypeOf(client.call).parameter(0).toEqualTypeOf<'guild.stats'>();
    expectTypeOf(client.call).returns.toEqualTypeOf<
      Promise<{
        members: number;
      }>
    >();
    client.close();
  });

  it('rejects array subclasses without executing inherited serializers', () => {
    let calls = 0;
    class CustomArray extends Array<unknown> {
      toJSON() {
        calls++;
        return ['converted'];
      }
    }
    const input = new CustomArray();
    input.push('original');
    expect(() => encodeJson(input, 1024)).toThrow('plain JSON');
    expect(calls).toBe(0);
  });

  it('rejects inherited object serializers without evaluating their getters', () => {
    const original = Object.getOwnPropertyDescriptor(Object.prototype, 'toJSON');
    let calls = 0;
    let failure: unknown;
    try {
      Object.defineProperty(Object.prototype, 'toJSON', {
        configurable: true,
        get() {
          calls++;
          return () => 'converted';
        },
      });
      try {
        encodeJson({ value: 42 }, 1024);
      } catch (error) {
        failure = error;
      }
    } finally {
      if (original) Object.defineProperty(Object.prototype, 'toJSON', original);
      else Reflect.deleteProperty(Object.prototype, 'toJSON');
    }
    expect(failure).toBeInstanceOf(TypeError);
    expect(calls).toBe(0);
  });

  it('reuses the codec safely after invalid UTF-8 and preserves shared JSON subobjects', () => {
    expect(() => decodeJson(new Uint8Array([0xff]), 1024)).toThrow();
    const shared = Object.assign(Object.create(null), { value: 42 });
    const input = { first: shared, second: shared };
    expect(decodeJson(encodeJson(input, 1024), 1024)).toEqual({
      first: { value: 42 },
      second: { value: 42 },
    });
  });

  it('rejects remote plaintext by default and invalid connection configuration', () => {
    expect(() => createRpcClient({ url: 'http://example.com', token: 'test' })).toThrow('TLS');
    expect(() => createRpcClient({ url: 'https://example.com', token: '' })).toThrow('token');
    expect(() =>
      createRpcClient({ url: 'https://example.com', token: 'test', protocol: 'grpc', httpVersion: '1.1' }),
    ).toThrow('HTTP/2');
  });

  it('reports an unavailable server and disallows calls after closing', async () => {
    const client = createRpcClient({ url: 'http://127.0.0.1:1', token: 'test', timeoutMs: 1000 });
    await expect(client.call('echo', null)).rejects.toMatchObject({ code: Code.Unavailable });
    client.close();
    client.close();
    await expect(client.call('echo', null)).rejects.toMatchObject({ code: Code.Unavailable });
  });

  it('rejects canceled calls before serializing the input', async () => {
    const client = createRpcClient({ url: 'http://127.0.0.1:1', token: 'test' });
    const controller = new AbortController();
    controller.abort();
    try {
      await expect(client.call('echo', undefined, { signal: controller.signal })).rejects.toMatchObject({
        code: Code.Canceled,
      });
      await expect(client.call('bad method', null)).rejects.toMatchObject({ code: Code.InvalidArgument });
    } finally {
      client.close();
    }
  });

  it('rejects tokens that cannot be transported as HTTP headers', () => {
    expect(() => createRpcClient({ url: 'http://127.0.0.1:1', token: 'é'.repeat(32) })).toThrow('ASCII');
    expect(() => createRpcClient({ url: 'http://127.0.0.1:1', token: 'a'.repeat(4097) })).toThrow('4096');
  });

  it('rejects excessive JSON nesting and numeric overflow when decoding', () => {
    expect(() => decodeJson(Buffer.from('1e999'), 1024)).toThrow();
    expect(() => decodeJson(Buffer.from(`${'['.repeat(65)}0${']'.repeat(65)}`), 1024)).toThrow('64');
    expect(decodeJson(Buffer.from('{"__proto__":{"safe":true},"nested":[null,false,2]}'), 1024)).toEqual(
      JSON.parse('{"__proto__":{"safe":true},"nested":[null,false,2]}'),
    );
  });
});
