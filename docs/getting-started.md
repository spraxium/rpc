# Connect a bot to a backend

The bot keeps its Discord connection and application services. The backend handles web routes, sessions and user authorization. RPC lets that backend call selected bot methods without loading Discord.js or sharing the Discord token. This tutorial follows the JavaScript examples included in the repository.

## Build the packages

Use Node.js `>=22.23.2 <27` and the pnpm version pinned in `package.json`. From the repository root, install dependencies and build the three RPC packages:

```bash
pnpm install --frozen-lockfile
pnpm build
```

The bot adapter requires framework hooks that are absent from public Spraxium 0.3.2. Install matching packages from a compatible framework build before running the bot. The [compatibility guide](framework-compatibility.md) explains the required hooks and release gate. There is no automatic framework preparation step. If a compatible bot is already running, the backend examples can connect to it directly.

For an application outside this workspace, use `pnpm pack` in `packages/protocol`, `packages/client` and, for the bot, `packages/spraxium`. Install the protocol archive with the client or adapter archive so their dependency resolves locally. The packages have not been published to npm yet. The HTTP backend needs only the client and protocol; it does not need the framework archives.

## Set the credentials

Copy `.env.example` to `.env` in the repository root. Set `DISCORD_TOKEN` for the bot, `SPRAXIUM_RPC_TOKEN` for both processes, and `SPRAXIUM_RPC_URL=http://127.0.0.1:4300` for the backend. The start commands load this file through Node. Existing shell variables take precedence.

Generate a separate RPC token with the following command. Use 32–4096 printable ASCII characters without whitespace. Keep the token in server configuration and give different credentials to backends that need different permissions.

```bash
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

## Configure the plugin

The bot's [spraxium.config.js](../examples/bot/spraxium.config.js) adds `defineRpc` to the framework's plugins array. The minimal configuration enables a loopback listener and grants the backend permission to read guild statistics:

```javascript
import { defineConfig } from '@spraxium/core';
import { defineRpc } from '@spraxium/rpc';

export default defineConfig({
  plugins: [defineRpc({
    token: process.env.SPRAXIUM_RPC_TOKEN ?? '',
    permissions: ['guild:read'],
  })],
});
```

The defaults are port 4300, a ten-second timeout, a 1 MiB JSON limit, 100 concurrent executions and 120 requests per credential per minute. Startup rejects invalid credentials before opening the listener. Omit the plugin or set `enabled: false` to disable RPC. See the [adapter reference](../packages/spraxium/README.md) for all options.

## Register the module and services

Import `RpcModule` in the application module alongside your feature modules. [AppModule](../examples/bot/src/app.module.js) imports the guild module and registers its RPC provider. `GuildModule` exports `GuildService`, allowing the provider to receive the same service instance used elsewhere in the bot.

```javascript
import { Module } from '@spraxium/common';
import { RpcModule } from '@spraxium/rpc';
import { GuildModule } from './guild.module.js';
import { GuildRpcService } from './guild-rpc.service.js';

export class AppModule {}

Module({
  imports: [RpcModule, GuildModule],
  providers: [GuildRpcService],
})(AppModule);
```

Both the module import and plugin configuration are required. The plugin supplies settings; the module registers providers and handler discovery.

The examples call decorator functions directly because plain JavaScript does not emit TypeScript decorator metadata. [GuildService](../examples/bot/src/guild.service.js) declares its constructor's `design:paramtypes` and injection token explicitly. [GuildRpcService](../examples/bot/src/guild-rpc.service.js) does the same for its service dependency. Keep those declarations beside their class when adding constructor parameters. Load `reflect-metadata` before registering the classes, as the bot entry point does.

## Expose a method

`GuildService.getStats` reads the joined guild from the Discord client's cache and returns `{ members, premium, shardId }`. It throws an intentional `NotFound` error when the guild is absent. It returns selected fields rather than a Discord object.

`GuildRpcService.stats` delegates to that service. Its method registration selects guild routing, requires `guild:read` and validates the input and response with Zod. The complete provider is in [guild-rpc.service.js](../examples/bot/src/guild-rpc.service.js). The registration uses the method's property descriptor:

```javascript
RpcHandler('guild.stats', {
  routing: 'guild',
  permissions: ['guild:read'],
  schema: z.object({ guildId: z.string() }).strict(),
})(GuildRpcService.prototype, 'stats',
  Object.getOwnPropertyDescriptor(GuildRpcService.prototype, 'stats'));
```

Zod is an example dependency, not a required RPC dependency. Any synchronous schema with a `parse` method can validate or transform input and output. Guild routing additionally validates the top-level `guildId` as a positive unsigned 64-bit decimal string. A schema cannot change that identifier. Send snowflakes as strings to preserve precision.

## Start the bot and backend

After installing a compatible framework build, run `pnpm example:bot`. The entry point creates the application, registers `AppModule` and starts it. The gateway opens only after the providers are ready. Set `RPC_SHARDING=true` to use the framework's native sharding; the parent opens one listener and routes each guild call to its owner.

In another terminal, run `pnpm example:hono` and request `GET http://127.0.0.1:3000/guilds/<guildId>/stats`. Use a guild the bot has joined. The backend calls the RPC handler and returns its DTO. An invalid ID returns 400, an absent guild returns 404 and a failed bot call returns 503.

Choose `pnpm example:nestjs`, `example:fastify`, `example:express`, `example:koa` or `example:node-http` to run another backend. They share the same method and response shape. Each uses port 3000 by default; set `PORT` to run more than one. Their implementations are described in the [backend guide](backends.md).

## Call from a separate process

Create one client for the backend's lifetime and pass it into the classes that need it. For a short-lived task, close it in `finally`:

```javascript
import { createRpcClient } from '@spraxium/rpc-client';

const rpc = createRpcClient({
  url: process.env.SPRAXIUM_RPC_URL,
  token: process.env.SPRAXIUM_RPC_TOKEN,
});

try {
  const stats = await rpc.call('guild.stats', { guildId: '123456789012345678' }, {
    timeoutMs: 3000,
  });
  console.log(stats);
} finally {
  rpc.close();
}
```

The [console examples](../examples/node-client/README.md) show ESM and CommonJS. In an HTTP server, close the client after accepted HTTP requests drain. Inspect `RpcClientError.code` to map expected failures; unexpected handler exceptions are redacted by the gateway.

## Deploy the integration

The RPC credential authorizes a backend service. It does not prove that a dashboard user can access a guild. Check the user's session and guild permissions in the backend before calling a privileged method, and keep bot permission and role hierarchy checks in the bot's business service.

Use HTTPS for connections between hosts. The bot example reads PEM files from `SPRAXIUM_RPC_TLS_CERT` and `SPRAXIUM_RPC_TLS_KEY`; Node clients can trust a private CA through `NODE_EXTRA_CA_CERTS`. When a trusted edge terminates TLS, restrict the plaintext hop to that edge and configure it explicitly. Never pass the service token to frontend code.

Calls have deadlines and accept an `AbortSignal`. Handlers must cooperate with cancellation. Cancellation does not reverse an operation already accepted by Discord. The SDK does not retry application calls automatically; use persistent application idempotency keys before retrying mutations whose result was lost.

Run `pnpm test:examples` to verify all JavaScript integrations locally without logging into Discord, and `pnpm test:interop` to check the gRPC transport. See [HTTP migration](http-migration.md) to replace existing bridge operations one at a time.
