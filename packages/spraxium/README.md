# @spraxium/rpc

Expose selected bot methods to a backend over Connect or gRPC. Handlers use existing DI providers, with authentication, explicit permissions, bounded execution and native shard routing.

## Installation

```bash
pnpm example:prepare --framework ../framework
```

The adapter has not been released to npm. The public framework 0.3.2 does not contain all required hooks; use the compatible local framework checkout. Once those hooks are released and validated, installation will use `pnpm add @spraxium/rpc`. The [compatibility record](../../compatibility/framework.json) and `prepublishOnly` gate prevent publishing the adapter before that dependency is recorded. Start with the [integration tutorial](../../docs/getting-started.md).

## Register handlers in existing modules

```typescript
import { Inject, Injectable, Module } from '@spraxium/common';
import { RpcHandler, RpcModule } from '@spraxium/rpc';
import { z } from 'zod';

@Injectable()
class GuildService {
  getStats(guildId: string) {
    return { guildId, members: 42, premium: false };
  }
}

@Injectable()
class GuildRpcService {
  constructor(@Inject(GuildService) private readonly guilds: GuildService) {}

  @RpcHandler('guild.stats', {
    routing: 'guild',
    permissions: ['guild:read'],
    schema: z.object({ guildId: z.string() }).strict(),
  })
  async stats(input: { guildId: string }) {
    return this.guilds.getStats(input.guildId);
  }
}

@Module({
  imports: [RpcModule],
  providers: [GuildService, GuildRpcService],
})
export class AppModule {}
```

Install `zod` when using this example. A schema is any synchronous object with `parse(input: unknown): unknown`; Zod is optional. The parser may reject or transform input, but may not change `guildId`. Add `responseSchema` to validate or project the returned DTO. Asynchronous schemas are rejected, and schema errors are redacted. TypeScript types do not validate incoming data. Without schemas, the JSON contract and guild routing identifier are still validated.

`RpcModule` is a global module, following the same registration pattern as `ScheduleModule`. It registers its registry, configuration resolver, framework host and lifecycle as injectable providers. Import it in the root or a shared module; repeated imports resolve to the same module instance. Handlers may live in any imported feature module, including modules loaded before `RpcModule`. Discovery uses the actual DI instances. Duplicate handler names fail initialization. An undecorated override hides an inherited handler.

## Configuration

```typescript
import { defineConfig } from '@spraxium/core';
import { defineRpc } from '@spraxium/rpc';

export default defineConfig({
  plugins: [defineRpc({
    token: process.env.SPRAXIUM_RPC_TOKEN ?? '',
    permissions: ['guild:read'],
  })],
});
```

Generate a random token with `node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"` and store it in an environment secret. Tokens must contain 32–4096 printable ASCII characters without whitespace; missing, duplicate or invalid credentials fail before a listener opens. The shorthand creates credential `default`; omitted permissions grant no named permission.

For multiple backends, use `auth: { tokens: [{ id: 'dashboard', value: secret, permissions: ['guild:read'] }] }` instead of `token`/`permissions`. Credential IDs must be unique identifiers of at most 64 characters. Supplying both configuration forms is an error.

Both `imports: [RpcModule]` and the `defineRpc(...)` plugin configuration are required. A configured plugin is enabled by default. With no configuration, or `enabled: false`, no listener or IPC worker starts. The listener opens after all provider `onReady` hooks complete. In shard mode only the parent opens a port.

| Option | Default | Meaning |
|---|---|---|
| `host`, `port` | `127.0.0.1`, `4300` | Listener address; `port: 0` chooses a free port |
| `maxPayloadBytes` | 1 MiB | Maximum UTF-8 JSON bytes in each input/output; bounded Protobuf envelope overhead is separate |
| `timeoutMs` | 10,000 | Maximum execution time; shorter client deadlines take precedence |
| `maxConcurrentCalls` | 100 | Gateway in-flight calls and actual running executions per shard/direct executor |
| `rateLimit` | 120 requests / 60,000 ms | Fixed window per authenticated credential, shared across that credential's connections |
| `shutdownGraceMs` | 5,000 | Time allowed for active calls to finish |
| `singletonShard` | 0 | Designated shard for global operations |
| `tls` | absent | `{ key, cert }` PEM strings or buffers; native TLS with HTTP/2 and HTTP/1.1 |
| `tlsTerminationProxy` | false | Explicit assertion that an exposed plaintext port is isolated behind a trusted TLS edge/private network |

## Authentication and authorization

Clients send `authorization: Bearer <token>` in metadata. Tokens are SHA-256 hashed and compared using `timingSafeEqual`. Permissions come exclusively from server configuration. A handler requires **all** listed permissions; there are no implicit wildcards.

Omitting permissions, or using an empty permissions list, is a startup error unless the handler explicitly declares `allowAuthenticated: true`. That declaration permits any valid credential, never anonymous access. When combined with permissions, the permissions still apply. Never send dashboard user permissions as proof of authorization inside the payload. Your backend must enforce its own web authentication and per-user guild access before calling RPC.

## Handler context and cancellation

```typescript
import type { RpcContext } from '@spraxium/rpc';

class StatusService {
  status(_input: unknown, context: RpcContext) {
    context.signal.throwIfAborted();
    return { caller: context.identity.id, requestId: context.requestId };
  }
}
```

The context contains immutable credential identity/permissions, a server-generated request ID, deadline (`Date`) and an `AbortSignal`. Pass the signal to cancellable downstream work. A timeout/cancel returns promptly, but JavaScript cannot forcibly terminate a handler that ignores cancellation, roll back a Discord operation, or interrupt blocking synchronous code. Such handlers retain their execution slot until they settle. Shutdown releases framework resources after the grace period; application-owned resources still belong to the application.

RPC is not a durable queue. Calls are dispatched once; there are no automatic application retries. If a response is lost, the caller cannot know whether a side effect committed. Design explicit idempotency keys in your application before retrying mutations.

## JSON contract

Inputs and outputs must be plain JSON: `null`, booleans, strings, finite numbers, dense arrays, and plain objects containing these values. Use decimal strings for snowflakes and large integers. Return `null` explicitly for an empty result.

`undefined` (including object properties), bigint, NaN/infinity, functions, symbols, getters/setters, non-enumerable properties, sparse/custom arrays, cycles, class instances, Date, Map, Buffer and Discord.js objects are rejected. `toJSON()` is never used to silently convert instances. Nesting is limited to 64 levels. Invalid UTF-8 and malformed JSON are rejected. Parse/encode limits count bytes, not JavaScript characters.

## Errors

| Condition | Connect/gRPC code |
|---|---|
| Unknown registered method | `NotFound` |
| Invalid JSON, schema input or guild ID | `InvalidArgument` |
| Missing/invalid token | `Unauthenticated` |
| Missing handler permission | `PermissionDenied` |
| Payload/output size, rate or concurrency limit | `ResourceExhausted` |
| Deadline | `DeadlineExceeded` |
| Cancellation | `Canceled` |
| Missing/dead shard, IPC failure, shutdown | `Unavailable` |
| Handler exception or invalid output representation | `Internal` |
| Response schema failure | `Internal` |

Throw `new RpcError('Safe public message', Code.NotFound)` for intentional application failures. Other exceptions, including raw ConnectError objects thrown inside handlers, are redacted. Stack traces, payloads and credentials are never logged by RPC. Completion logs contain method, duration, request ID and protocol code; `x-request-id` is returned in response metadata.

## Sharding

Use the existing `app.useSharding({ totalShards: 'auto' })`. No extra RPC sharding flag is needed. The parent uses `ParentHookRegistry`, collects and compares shard handler manifests, then starts one gateway. It never creates application providers. Shards attach explicit IPC listeners at boot and become callable after their providers are ready.

`routing: 'guild'` requires a positive unsigned 64-bit decimal `guildId` string at the input's top level. The parent uses Discord.js's `ShardClientUtil.shardIdForGuildId()` with the actual resolved shard count. Clients cannot supply a target shard. `routing: 'singleton'` runs on `singletonShard` (default 0), even when the data is global. A missing designated shard returns `Unavailable`.

Each shard invokes its own DI instance. Pending calls have correlation IDs, bounded deadlines, cancellation messages and cleanup on death/disconnect/shutdown. Manifests are refreshed on shard readiness after respawn; a different manifest keeps that shard unavailable. Duplicate IPC IDs do not reexecute within their original deadline. No handler invocation uses eval, function serialization or broadcast.

Singleton does not aggregate data across shards and is not a cluster-wide lock or shared service instance. Fan-out and cross-shard aggregation are outside v1. Native Spraxium process-mode shards remain on the manager's host; placing the external backend on another host is supported independently.

## Production and deployment

Use TLS for remote production connections. For direct TLS, set `tls: { key: readFileSync('key.pem'), cert: readFileSync('cert.pem') }` with `readFileSync` from `node:fs`. For a secure proxy, restrict the RPC port to that proxy and enable `tlsTerminationProxy: true`. The proxy must support HTTP/2 or h2c to the bot for gRPC/default SDK transport. Use `httpVersion: '1.1'` with Connect if your TLS edge speaks HTTP/1.1 to clients; the native plaintext development listener itself is HTTP/2 only.

Expose only the gateway path `/spraxium.rpc.v1.RpcGateway/Invoke`. Do not expose raw shard IPC. Restrict network access, provision scoped credentials for each backend, rotate secrets through deployment configuration, and add perimeter connection limits for untrusted networks. The simple credential rate limiter applies after protocol decoding; bounded transport message/header limits apply before handler execution.

The [runnable examples](../../examples/backends/README.md) include NestJS, Hono and Fastify backends and a direct or sharded Discord bot. The container configuration needs the same compatible framework release before it can run. See [the client SDK](../client/README.md), [the protocol](../protocol/README.md) and [HTTP migration](../../docs/http-migration.md).

## RPC and Signal

Use RPC when a caller needs an immediate typed response. Keep `@spraxium/signal` for asynchronous one-way events. RPC does not add Pub/Sub, delivery persistence, service discovery, cross-host shard orchestration or brokers. Signal remains unchanged.
