# Node HTTP

A JavaScript backend using `node:http` and the RPC client. Follow the [setup guide](../README.md), configure the running bot's URL and RPC token, then run `pnpm example:node-http` from the repository root.

[NodeHttpDashboard](src/dashboard.application.js) parses `GET /guilds/:guildId/stats`, calls the bot and writes a JSON response. It cancels the downstream call when the response closes prematurely and removes the listener after completion. Shutdown drains requests before closing the client.

Use `HTTP_HOST` and `PORT` to override `127.0.0.1:3000`. Add HTTP authentication and guild authorization before exposing the route. There is no web framework or Discord.js dependency.
