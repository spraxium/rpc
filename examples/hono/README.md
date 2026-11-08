# Hono

A JavaScript Hono backend calling `guild.stats`. Follow the [setup guide](../README.md), configure the running bot's URL and RPC token, then run `pnpm example:hono` from the repository root.

[src/main.js](src/main.js) creates one SDK client and passes it to [HonoDashboard](src/dashboard.application.js). The class registers `GET /guilds/:guildId/stats`, maps RPC failures and owns the Node listener. Shutdown drains HTTP requests before closing the client.

The listener defaults to `127.0.0.1:3000`; use `HTTP_HOST` and `PORT` to change it. Add session and guild-access middleware before deploying the route. The backend does not need Discord.js or the bot token.
