# NestJS

A JavaScript NestJS backend with an injected RPC client, service and controller. Follow the [setup guide](../README.md), set the running bot's URL and RPC token, then run `pnpm example:nestjs` from the repository root.

[DashboardModule](src/dashboard.module.js) provides one client under `BOT_RPC_CLIENT`. [BotRpcService](src/bot-rpc.service.js) calls `guild.stats` and translates failures into Nest exceptions. [GuildController](src/guild.controller.js) exposes `GET /guilds/:guildId/stats`.

Decorator functions are invoked directly, with explicit injection tokens, so Node can run the sources without a TypeScript build. The entry point enables shutdown hooks; the service closes the client after HTTP shutdown.

The listener defaults to `127.0.0.1:3000` and accepts `HTTP_HOST` and `PORT`. Add authentication and guild-access guards before exposing the endpoint. This backend needs neither Discord.js nor the Discord bot token.
