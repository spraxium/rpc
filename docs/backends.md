# HTTP backends

The six HTTP examples create one RPC client for the application. They do not need the Discord token, Discord.js or a Spraxium runtime. Routes call `guild.stats` on a running bot and return its plain JSON result. The [examples guide](../examples/README.md) covers environment setup and start commands.

## NestJS

Run `pnpm example:nestjs`. [DashboardModule](../examples/nestjs/src/dashboard.module.js) creates the client through a factory provider named `BOT_RPC_CLIENT`. [BotRpcService](../examples/nestjs/src/bot-rpc.service.js) receives it through injection, calls the bot and translates RPC failures into Nest exceptions. [GuildController](../examples/nestjs/src/guild.controller.js) handles the HTTP route and delegates to that service.

The example uses the public Nest decorator functions directly so it can run as JavaScript without a compiler. `Inject`, `Controller`, `Get` and `Param` register the same metadata used by their decorator syntax. The entry point enables shutdown hooks, and the service closes the RPC connection in `onApplicationShutdown`.

Add authentication and guild-access guards before exposing privileged operations. Keep the service credential in the application provider; do not accept it from a browser request.

## Hono

Run `pnpm example:hono`. Its [entry point](../examples/hono/src/main.js) passes the client to [HonoDashboard](../examples/hono/src/dashboard.application.js). The class registers the route and error handler, starts the Node server and owns shutdown. Its close method reuses the same promise when called more than once and releases the RPC client after the HTTP listener drains.

## Fastify

Run `pnpm example:fastify`. [FastifyDashboard](../examples/fastify/src/dashboard.application.js) receives the Fastify application and RPC client. It registers the statistics route, error handler and `onClose` hook before listening. The close hook releases the client after accepted HTTP requests finish. Add application authentication through Fastify hooks or plugins.

## Express

Run `pnpm example:express`. [ExpressDashboard](../examples/express/src/dashboard.application.js) registers an Express 5 route and owns its Node HTTP listener. The route maps failures to HTTP responses. Shutdown closes the listener before releasing the RPC client. Place authentication and guild-access middleware before the statistics route.

## Koa

Run `pnpm example:koa`. [KoaDashboard](../examples/koa/src/dashboard.application.js) handles the statistics path in one middleware method without a separate router. It maps RPC errors and owns both the HTTP server and client. Add session and authorization middleware before the route middleware.

## Native Node HTTP

Run `pnpm example:node-http`. [NodeHttpDashboard](../examples/node-http/src/dashboard.application.js) uses `node:http`, parses the path and writes JSON responses. It forwards premature response closure through an `AbortSignal` and removes that listener after the call. This example adds no web framework dependency.

## Errors and request lifetime

The examples map `NotFound` to 404, `InvalidArgument` to 400 and other RPC failures to 503. A deployed API may need separate responses for service credentials, permissions, quotas and deadlines. Inspect `RpcClientError.code` and choose an appropriate public response without copying internal exceptions.

The SDK accepts `timeoutMs` and `signal` for each call. Pass a disconnection signal when the HTTP framework provides one, and make downstream handlers observe it. Cancellation does not undo a Discord mutation that already completed. Mutations that can be retried need application-owned idempotency keys.

For readiness, add a small authorized application handler if the backend needs to check the bot. The package does not implement a standard gRPC Health service. Keep checks short and account for their requests in credential rate limits.
