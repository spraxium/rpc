# Koa

A JavaScript Koa backend calling `guild.stats` without an extra router. Follow the [setup guide](../README.md), configure the running bot's URL and RPC token, then run `pnpm example:koa` from the repository root.

[KoaDashboard](src/dashboard.application.js) handles `GET /guilds/:guildId/stats` in one middleware method. It maps RPC failures, owns the HTTP listener and closes the shared SDK client after HTTP shutdown.

The default listener is `127.0.0.1:3000`, configurable through `HTTP_HOST` and `PORT`. Register session and guild authorization middleware before the statistics handler. Discord.js and the bot token remain in the bot process.
