# @spraxium/rpc-client

Independent Node.js/TypeScript SDK for calling Spraxium bot handlers from any backend. It depends only on ConnectRPC and the shared Protobuf/JSON protocol; it has no dependency on Discord.js, core, DI or bot modules.

```bash
pnpm add @spraxium/rpc-client
```

```typescript
import { Code, RpcClientError, createRpcClient } from '@spraxium/rpc-client';

// Share this interface through your own types library, without importing bot services.
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
  console.log(stats.members); // number
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

| Option | Default |
|---|---|
| `url`, `token` | required |
| `timeoutMs` | 10,000 ms; per-call override supported |
| `maxPayloadBytes` | 1 MiB input/output JSON |
| `protocol` | `connect`; `grpc` also supported |
| `httpVersion` | `2`; `1.1` available for Connect through TLS/native TLS/proxy |
| `allowInsecure` | false for remote plaintext connections |

The default HTTP/2 transport manages a persistent connection. `close()` aborts pending calls, closes its session/agent and prevents new calls. It is idempotent. Cancellation and shorter deadlines propagate to the bot and shard. There are no application retries. A network failure or timeout cannot prove that a side effect did not happen; use application idempotency before retrying mutations.

Use HTTPS across production servers and the platform trust store for certificates (including `NODE_EXTRA_CA_CERTS` for a private CA). Loopback plaintext is allowed for development. `allowInsecure: true` explicitly permits a private hop inside an isolated network behind a secure TLS boundary; never send access tokens over a public plaintext connection. Tokens are backend secrets and must not be included in frontend bundles.

NestJS, Hono and Fastify backends can use the same client. Each backend owns its routes, web authentication and user authorization. RPC credentials authorize the backend's access to the bot, not a dashboard user's access to guilds.

## Development

Building and testing the client requires sources or built artifacts for the `@spraxium/rpc-protocol` workspace dependency.

```bash
pnpm --filter @spraxium/rpc-client... build
pnpm --filter @spraxium/rpc-client typecheck
pnpm --filter @spraxium/rpc-client test
```
