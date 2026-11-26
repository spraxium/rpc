# @spraxium/rpc

Run an authenticated RPC gateway inside a Spraxium Discord bot. A separate Node.js backend can call a registered method and receive JSON while the Discord token stays in the bot.

Use Spraxium 0.10.x and Discord.js 14.28.1 or a compatible 14.x release. Install the adapter in the bot.

```sh
pnpm add @spraxium/rpc
```

Add `defineRpc` to the plugins in `spraxium.config.ts`. The gateway defaults to `127.0.0.1:4300`.

```ts
import { defineConfig } from '@spraxium/core';
import { defineRpc } from '@spraxium/rpc';

export default defineConfig({
  plugins: [
    defineRpc({
      token: process.env.SPRAXIUM_RPC_TOKEN ?? '',
      permissions: ['bot:read'],
    }),
  ],
});
```

Import `RpcModule` and register a provider with a handler. This example can run in a single bot process or in a sharded bot.

```ts
import { Injectable, Module } from '@spraxium/common';
import { RpcHandler, RpcModule } from '@spraxium/rpc';

@Injectable()
class HealthService {
  @RpcHandler('bot.health', { routing: 'singleton', permissions: ['bot:read'] })
  health() {
    return { ready: true };
  }
}

@Module({ imports: [RpcModule], providers: [HealthService] })
export class AppModule {}
```

Set `SPRAXIUM_RPC_TOKEN` to the same service secret in the bot and the backend. Use `@spraxium/rpc-client` to call `bot.health` from the backend. Keep the credential on the server and use HTTPS between hosts. For guild handlers, use `routing: 'guild'` and include `guildId` in the input so the gateway can select the right shard.

If your bot uses `@spraxium/http`, move its public routes into your backend and call the bot from those routes.

[First call](https://spraxium.com/en/guide/rpc-quickstart) · [Handler reference](https://spraxium.com/en/guide/rpc-handlers) · [HTTP migration](https://spraxium.com/en/guide/rpc-http-migration)
