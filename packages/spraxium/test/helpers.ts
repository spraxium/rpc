import type { RpcConfig } from '../src/configuration/interfaces/rpc-config.interface';
import { RpcConfigResolver } from '../src/configuration/rpc-config.resolver';

export const token = 'test-credential-with-more-than-32-characters';

export function config(overrides: Partial<RpcConfig> = {}) {
  return new RpcConfigResolver().resolve({
    enabled: true,
    port: 0,
    auth: {
      tokens: [
        { id: 'dashboard', value: token, permissions: ['guild:read'] },
        { id: 'limited', value: `${token}-limited`, permissions: [] },
      ],
    },
    ...overrides,
  });
}

export function deferred<T>() {
  let resolve: (value: T) => void = () => {
    throw new Error('Deferred not initialized.');
  };
  const promise = new Promise<T>((complete) => {
    resolve = complete;
  });

  return { promise, resolve };
}
