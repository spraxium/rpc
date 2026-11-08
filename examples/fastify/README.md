# Fastify

A JavaScript Fastify backend calling `guild.stats`. Follow the [setup guide](../README.md), configure the running bot's URL and RPC token, then run `pnpm example:fastify` from the repository root.

[src/main.js](src/main.js) creates the Fastify application and SDK client. [FastifyDashboard](src/dashboard.application.js) registers `GET /guilds/:guildId/stats`, error handling and an `onClose` hook. That hook closes the client after HTTP requests drain; failed startup also closes the application.

Use `HTTP_HOST` and `PORT` to change the default `127.0.0.1:3000` listener. Add authentication and guild authorization through Fastify hooks before deployment. Discord.js and the bot token stay in the bot process.
