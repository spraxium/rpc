# @spraxium/rpc-client

Call bot handlers from a Node.js backend. The client uses ConnectRPC and the shared Protobuf/JSON protocol. It installs neither Discord.js nor the Spraxium runtime.

```bash
pnpm --filter @spraxium/rpc-client... build
pnpm pack:local
```

```typescript
import { Code, RpcClientError, createRpcClient } from '@spraxium/rpc-client';

interface BotRpcContract {
  'guild.stats': {
    input: { guildId: string };
    output: { members: number; premium: boolean };
  };
}

const rpc = createRpcClient<BotRpcContract>({
  url: process.env.SPRAXIUM_RPC_URL ?? 'http://127.0.0.1:4300',
  token: process.env.SPRAXIUM_RPC_TOKEN ?? '',
});

try {
  const stats = await rpc.call('guild.stats', { guildId: '123456789012345678' }, {
    timeoutMs: 3000,
    signal: AbortSignal.timeout(5000),
  });
  console.log(stats.members);
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

Without a generic contract, `call` accepts method strings with unknown input/output. Contract types are compile-time only; bot-side schemas validate runtime input. Inputs and outputs must be plain JSON: null, booleans, finite numbers, strings, dense arrays and plain objects. Send snowflakes and other large integer identifiers as decimal strings. Class instances, bigint, undefined, getters, cycles and implicit `toJSON` conversions are rejected. Missing or unserializable outputs fail instead of becoming `null`.

The package is not published to npm yet. Install the generated client/protocol archives for development, or run the [prepared examples](../../examples/backends/README.md). Once released, the backend installation command is `pnpm add @spraxium/rpc-client`.

ESM imports and CommonJS `require('@spraxium/rpc-client')` load the same implementation on the supported Node versions (`>=22.23.2 <27`). This preserves the identity of `RpcClientError` across both entry points. Package installation tests also compile a typed consumer with CommonJS output, as used by default NestJS projects.

| Option | Default |
|---|---|
| `url`, `token` | required; token uses printable ASCII, up to 4096 characters without whitespace |
| `timeoutMs` | 10,000 ms; per-call override supported |
| `maxPayloadBytes` | 1 MiB input/output JSON |
| `protocol` | `connect`; `grpc` also supported |
| `httpVersion` | `2`; `1.1` available for Connect through TLS/native TLS/proxy |
| `allowInsecure` | false for remote plaintext connections |

Create one client per backend process and close it after HTTP requests drain. The HTTP/2 transport manages a persistent connection; HTTP/1.1 allocates only its keep-alive agent. `close()` aborts pending calls, releases transport resources and prevents new calls. Repeated close calls are safe. Already-canceled calls are rejected before serializing input. Cancellation and shorter deadlines propagate to the bot and shard. There are no application retries. A network failure or timeout cannot prove that a side effect did not happen; use application idempotency before retrying mutations.

Use HTTPS across production servers and the platform trust store for certificates (including `NODE_EXTRA_CA_CERTS` for a private CA). Loopback plaintext is allowed for development. `allowInsecure: true` explicitly permits a private hop inside an isolated network behind a secure TLS boundary; never send access tokens over a public plaintext connection. Tokens are backend secrets and must not be included in frontend bundles.

Follow the [integration tutorial](../../docs/getting-started.md) and [NestJS, Hono and Fastify guide](../../docs/backends.md). Each backend owns its routes, web authentication and user authorization. RPC credentials authorize the backend's access to the bot; the backend must verify a dashboard user's guild access separately.

## Development

Building and testing the client requires sources or built artifacts for the `@spraxium/rpc-protocol` workspace dependency.

```bash
pnpm --filter @spraxium/rpc-client... build
pnpm --filter @spraxium/rpc-client typecheck
pnpm --filter @spraxium/rpc-client test
```
