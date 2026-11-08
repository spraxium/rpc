# Express

A JavaScript Express 5 backend calling `guild.stats`. Follow the [setup guide](../README.md), configure the running bot's URL and RPC token, then run `pnpm example:express` from the repository root.

[ExpressDashboard](src/dashboard.application.js) exposes `GET /guilds/:guildId/stats`, maps RPC failures and owns the HTTP listener. Its shutdown promise is reused across repeated calls, and the SDK client closes after accepted requests finish.

`HTTP_HOST` and `PORT` override `127.0.0.1:3000`. Add authentication and guild-access middleware before the route when deploying it. This backend does not need Discord.js or the bot token.
