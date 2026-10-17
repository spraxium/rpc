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
});
