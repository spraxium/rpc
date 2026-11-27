import { readFileSync } from 'node:fs';
import type { RpcConfig } from '@spraxium/rpc';

export class ExampleRpcTls {
  static fromEnvironment(): RpcConfig['tls'] {
    const key = process.env.SPRAXIUM_RPC_TLS_KEY;
    const cert = process.env.SPRAXIUM_RPC_TLS_CERT;
    if (!key && !cert) return undefined;
    if (!key || !cert) throw new Error('Set both SPRAXIUM_RPC_TLS_KEY and SPRAXIUM_RPC_TLS_CERT.');

    return { key: readFileSync(key), cert: readFileSync(cert) };
  }
}
