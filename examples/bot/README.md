# Spraxium bot

Exposes `guild.stats` through an injected guild service. The provider requires `guild:read`, validates input and output with Zod, and returns `{ members, premium, shardId }`.

Follow the [setup guide](../README.md), install a [compatible framework build](../../docs/framework-compatibility.md), set `DISCORD_TOKEN` and `SPRAXIUM_RPC_TOKEN` in the root `.env`, then run `pnpm example:bot` from the repository root. The public framework does not yet have all required hooks.

[src/main.js](src/main.js) creates the application. [AppModule](src/app.module.js) imports `RpcModule` and the guild feature module. [GuildService](src/guild.service.js) owns Discord lookups; [GuildRpcService](src/guild-rpc.service.js) owns RPC registration and schemas. The JavaScript files call decorator functions and declare constructor metadata explicitly.

[spraxium.config.js](spraxium.config.js) configures the listener and credentials. Set `RPC_SHARDING=true` for native sharding. Set both `SPRAXIUM_RPC_TLS_KEY` and `SPRAXIUM_RPC_TLS_CERT` to absolute PEM paths for HTTPS; leave both empty for local loopback HTTP/2. Backends receive the RPC token, not the Discord token.
