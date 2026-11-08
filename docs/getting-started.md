# Connect a Spraxium bot to a backend

The bot owns its Discord connection and application services. The backend owns its web routes, sessions and user authorization. RPC lets the backend call a small set of bot methods without loading the bot or sharing its Discord token. This tutorial starts with one guild statistics method, then explains validation, permissions, shutdown and deployment.

## Start with compatible packages

The bot adapter needs module integrations, discovery of existing DI instances, an application-ready hook and awaited parent shutdown. These hooks exist in the local framework checkout and are not in the public framework release. Do not install the public framework and expect the adapter to work. The release status is recorded in [framework compatibility](framework-compatibility.md).

For the current development version, clone this repository alongside a compatible framework checkout. From the RPC repository, run these commands. Preparation builds and packs both repositories, then installs the example in `.local/`. It does not change workspace dependencies or overwrite an environment file.

```bash
pnpm install --frozen-lockfile
pnpm example:prepare --framework ../framework
```

Once compatible releases are published, existing bot applications will install `@spraxium/rpc`, while backends install `@spraxium/rpc-client`. Backends do not need the framework. Until then, `pnpm pack:local` produces archives for protocol/client development, and the example preparation command also includes the compatible framework archives.

## Configure a shared secret

Create a different RPC token for each backend that needs different permissions. It must be a random string between 32 and 4096 printable ASCII characters without whitespace. This token is separate from the Discord bot token. Keep it in the bot and backend environments; a browser should never receive it.

```bash
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

For the prepared example, copy `.env.example` to `.env` in the RPC repository and fill in `DISCORD_TOKEN` and `SPRAXIUM_RPC_TOKEN`. Keep `SPRAXIUM_RPC_URL=http://127.0.0.1:4300`. The example runner loads this file with Node's built-in environment loader. Variables already set by the shell or deployment environment take precedence. Both terminals read the same file, so the backend and bot receive the same RPC secret.

In an existing bot, put the RPC configuration in `spraxium.config.ts`. Importing `defineRpc` preserves the same `definePlugin` and `ConfigStore` behavior as the other Spraxium plugins. A token and its permissions are enough for a local listener.

```typescript
import { defineConfig } from '@spraxium/core';
import { defineRpc } from '@spraxium/rpc';

export default defineConfig({
  plugins: [
    defineRpc({
      token: process.env.SPRAXIUM_RPC_TOKEN ?? '',
      permissions: ['guild:read'],
    }),
  ],
});
```

The default address is `127.0.0.1:4300`, with a ten-second timeout, 1 MiB JSON payload limit, 100 concurrent executions and 120 requests per credential per minute. Omit the plugin or set `enabled: false` to disable the listener. A configured plugin is enabled by default. Limits and network settings are listed in the [adapter reference](../packages/spraxium/README.md).

## Register the module

Add `RpcModule` to the root application module. Keep business services in their existing feature modules and export services that another module needs to inject. The adapter discovers decorated methods on the actual provider instances; it does not construct another copy of your service.

```typescript
import { Module } from '@spraxium/common';
import { RpcModule } from '@spraxium/rpc';
import { GuildModule } from './guilds/guild.module';

@Module({ imports: [RpcModule, GuildModule] })
export class AppModule {}
```

Importing the module without the plugin leaves the gateway disabled. Configuring the plugin without importing the module does not register the bot-side providers. Keep both registrations together when reviewing an integration.

## Share a small contract

Put the application contract in a types-only file or package that the bot and backend can both import. It describes method names, inputs and outputs. It should not import Discord.js, bot services or DI decorators. A method name also serves as an application API version boundary; use a new name when consumers need a breaking change.

```typescript
export interface BotRpcContract {
  'guild.stats': {
    input: { guildId: string };
    output: { members: number; premium: boolean; shardId: number };
  };
}
```

The contract provides TypeScript inference. It cannot verify a value arriving over the network. Use a synchronous schema on the bot when the method accepts structured data. `schema` validates input and `responseSchema` validates or projects output before transmission. Any object with `parse(value: unknown): unknown` works; a validation library is optional. The example repository uses Zod in its demo application only.

## Expose the existing service

The example's [GuildService](../examples/backends/bot/guild.service.ts) receives the Discord client through DI, looks up the guild and returns a plain object. [GuildRpcService](../examples/backends/bot/guild-rpc.service.ts) receives that service and adds the RPC boundary. The separation keeps Discord rules in the service and input/response validation in the handler.

```typescript
import { Inject, Injectable } from '@spraxium/common';
import { RpcHandler } from '@spraxium/rpc';
import { z } from 'zod';
import type { BotRpcContract } from '../interfaces/bot-rpc-contract.interface';
import { GuildService } from './guild.service';

@Injectable()
export class GuildRpcService {
  constructor(@Inject(GuildService) private readonly guilds: GuildService) {}

  @RpcHandler('guild.stats', {
    routing: 'guild',
    permissions: ['guild:read'],
    schema: z.object({ guildId: z.string() }).strict(),
    responseSchema: z.object({
      members: z.number().int().nonnegative(),
      premium: z.boolean(),
      shardId: z.number().int().nonnegative(),
    }).strict(),
  })
  async stats(input: BotRpcContract['guild.stats']['input']): Promise<BotRpcContract['guild.stats']['output']> {
    return this.guilds.getStats(input.guildId);
  }
}
```

Register this class in its module's `providers`. A method is callable only when it has `@RpcHandler` and the provider belongs to the loaded module graph. Duplicate names stop initialization. Handlers without permissions must explicitly declare `allowAuthenticated: true`; otherwise initialization fails. The default is never anonymous access.

`routing: 'guild'` requires a positive decimal snowflake string named `guildId` at the top level of the input. The framework routes it to the owning shard. A schema may normalize other fields but cannot change this identifier after routing. Use `routing: 'singleton'` for an operation that belongs to the configured singleton shard, such as reading global application status. Singleton routing does not merge results from other shards.

## Call the bot

Create one client per backend process and reuse it for requests. The client keeps its transport resources until shutdown. Creating one for every HTTP request adds connections and makes cleanup harder.

```typescript
import { createRpcClient } from '@spraxium/rpc-client';
import type { BotRpcContract } from './bot-rpc-contract.interface';

const rpc = createRpcClient<BotRpcContract>({
  url: process.env.SPRAXIUM_RPC_URL ?? 'http://127.0.0.1:4300',
  token: process.env.SPRAXIUM_RPC_TOKEN ?? '',
});

const stats = await rpc.call('guild.stats', { guildId: '123456789012345678' }, { timeoutMs: 3000 });
console.log(stats.members);
rpc.close();
```

This small script closes immediately after its call. An HTTP backend instead closes the client in its application shutdown hook, after HTTP requests drain. The [backend guide](backends.md) covers NestJS, Hono and Fastify with the source files used by the runnable examples.

The SDK supports ESM imports and CommonJS `require()` on its supported Node versions. Both entry points load the same implementation and error class. No duplicate CJS build or separate metadata registry is created. Default NestJS CommonJS projects can use the published type declarations and compile their imports normally.

## Run the prepared application

Run `pnpm example:bot` from the RPC repository. It starts the packed bot against Discord with the values in `.env`. The bot must be a member of the guild you will query. In another terminal, choose `pnpm example:nest`, `pnpm example:hono` or `pnpm example:fastify`. Each backend listens on port 3000, so run one backend at a time.

```bash
curl http://127.0.0.1:3000/guilds/123456789012345678/stats
```

Replace the identifier with your test guild's ID. A successful response contains `members`, `premium` and `shardId`. A missing guild returns HTTP 404. An invalid identifier returns 400. Other RPC failures become 503 in these small read-only examples. Add your web authentication and verify the user's guild access before exposing them to dashboard users.

The repository's automated tests do not need a Discord token. `pnpm check` runs local network tests and fresh package installations. `pnpm test:framework --framework ../framework` adds real framework processes and shard IPC while simulating the Discord gateway. The sibling `rpc-test/` project additionally demonstrates slash commands and NestJS using the same bot service.

## Handle failures and cancellation

Import `RpcClientError` and `Code` from the SDK to inspect protocol errors. `NotFound` means the bot could not find a method or a resource; `Unauthenticated` means the credential was rejected; `PermissionDenied` means the configured token lacks a required permission. The full mapping is in the [adapter reference](../packages/spraxium/README.md#errors).

Supply an `AbortSignal` as the third call argument when downstream work should stop with its caller. Inside the handler, accept a second `RpcContext` argument and pass `context.signal` to operations that support cancellation. Shorter client deadlines take precedence over the configured server timeout. A handler that ignores its signal retains its concurrency slot until it finishes.

The client does not retry failed calls automatically. If a timeout happens after Discord accepted a ban, retrying the request may repeat a side effect. Add an application idempotency key and durable result storage before retrying mutations. A random request ID and the shard replay history provide correlation and bounded IPC duplicate protection; they are not a durable idempotency store.

## Deploy across machines

Loopback plaintext is allowed for local development. A listener on another interface requires direct TLS or `tlsTerminationProxy: true` for a port isolated behind a trusted TLS edge. The client likewise requires HTTPS for remote hosts unless `allowInsecure: true` explicitly permits an isolated private hop. Both settings describe the actual network boundary; neither setting encrypts traffic on its own.

For direct TLS, provide PEM `key` and `cert` values through `tls`. The listener supports HTTP/2 and HTTP/1.1 with TLS; the plaintext development listener is HTTP/2 only. Use the SDK defaults for HTTP/2 or `protocol: 'grpc'` for gRPC. Use `httpVersion: '1.1'` only with Connect behind an appropriate TLS endpoint or proxy. Trust private certificate authorities through Node's platform trust settings or `NODE_EXTRA_CA_CERTS`.

Keep the Discord token on the bot host. Give each backend only the RPC permissions it uses. The backend must continue checking the authenticated user's guild access and staff privileges before invoking a handler. RPC credentials authorize the backend service, not the person using a dashboard.
