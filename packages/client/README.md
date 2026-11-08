# @spraxium/rpc-client

Call bot handlers from a Node.js backend over Connect or gRPC. The client depends on the shared protocol and Connect libraries. It does not install Discord.js or the Spraxium runtime.

The package has not been published yet. In this workspace, run `pnpm --filter @spraxium/rpc-client... build`. For an external application, create protocol and client archives with `pnpm pack` in their package directories and install both archives. The [JavaScript examples](../../examples/README.md) use workspace dependencies directly.

```javascript
import { Code, RpcClientError, createRpcClient } from '@spraxium/rpc-client';

const rpc = createRpcClient({
  url: process.env.SPRAXIUM_RPC_URL ?? 'http://127.0.0.1:4300',
  token: process.env.SPRAXIUM_RPC_TOKEN ?? '',
});

try {
  const stats = await rpc.call('guild.stats', { guildId: '123456789012345678' }, {
    timeoutMs: 3000,
    signal: AbortSignal.timeout(5000),
  });
  console.log(stats);
} catch (error) {
  if (error instanceof RpcClientError && error.code === Code.Unavailable) {
    console.error('The bot is unavailable.');
  } else {
    throw error;
  }
} finally {
  rpc.close();
}
```

CommonJS can use `require('@spraxium/rpc-client')`. Both exports load the same implementation and preserve `RpcClientError` identity on supported Node versions, `>=22.23.2 <27`. TypeScript applications can supply an application contract to `createRpcClient` for editor checks; runtime validation still belongs in the bot's schemas.

## Options

| Option | Default |
| --- | --- |
| `url`, `token` | Required; token contains printable ASCII without whitespace, up to 4096 characters |
| `timeoutMs` | 10,000 ms; each call can override it |
| `maxPayloadBytes` | 1 MiB per input/output |
| `protocol` | `connect`; also accepts `grpc` |
| `httpVersion` | `2`; Connect also supports `1.1` through TLS |
| `allowInsecure` | `false` for remote plaintext connections |

Create one client per backend process. Close it after HTTP requests drain. HTTP/2 uses a persistent session; HTTP/1.1 uses a keep-alive agent. `close()` aborts pending calls, releases transport resources and rejects new calls. Repeated close calls are safe.

Inputs and outputs must be plain JSON. Send snowflakes as decimal strings. Undefined values, bigint, cycles, getters, class instances and implicit `toJSON` conversions are rejected. See the [JSON contract](../spraxium/README.md#json-contract).

Calls accept a timeout and cancellation signal. There are no automatic application retries. A failed connection does not prove that a Discord side effect failed; use application idempotency before retrying mutations.

Use HTTPS between hosts and keep credentials out of frontend bundles. A private CA can be configured with `NODE_EXTRA_CA_CERTS`. `allowInsecure: true` permits a private plaintext hop; it does not encrypt it. Each backend must separately authenticate its users and check their guild access.

See the [tutorial](../../docs/getting-started.md) and [backend guide](../../docs/backends.md) for integration and shutdown behavior.
