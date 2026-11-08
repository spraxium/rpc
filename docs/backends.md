# NestJS, Hono and Fastify

All three backends use `@spraxium/rpc-client` and a types-only application contract. None needs the Discord token, Discord.js or a Spraxium application instance. Each creates a client once, calls it from route handlers and closes it after the HTTP server drains. The [integration tutorial](getting-started.md) covers the bot setup and the current framework compatibility requirement.

Prepare the examples with `pnpm example:prepare --framework ../framework`, fill the root `.env` and start `pnpm example:bot`. Each of the commands below starts a separate example on port 3000. Use one backend at a time, or change its listening port in its entry point.

## NestJS

Run `pnpm example:nest`. [DashboardModule](../examples/backends/nest/dashboard.module.ts) registers a factory provider under `BOT_RPC_CLIENT`. The factory reads the RPC URL and token and calls `createRpcClient<BotRpcContract>`. This is the composition point for transport settings; feature services should receive this client through injection rather than create their own.

[BotRpcService](../examples/backends/nest/bot-rpc.service.ts) injects the client and calls `guild.stats`. [GuildController](../examples/backends/nest/guild.controller.ts) extracts the guild ID from `/guilds/:guildId/stats` and delegates to the service. Adding a second HTTP route should follow that separation: HTTP parameters and response handling belong in the controller, while calls and application decisions belong in the service.

```typescript
import { Inject, Injectable } from '@nestjs/common';
import type { OnApplicationShutdown } from '@nestjs/common';
import type { RpcClient } from '@spraxium/rpc-client';
import type { BotRpcContract } from '../interfaces/bot-rpc-contract.interface';
import { BOT_RPC_CLIENT } from './rpc-client.constant';

@Injectable()
export class BotRpcService implements OnApplicationShutdown {
  constructor(@Inject(BOT_RPC_CLIENT) private readonly rpc: RpcClient<BotRpcContract>) {}

  stats(guildId: string) {
    return this.rpc.call('guild.stats', { guildId });
  }

  onApplicationShutdown(): void {
    this.rpc.close();
  }
}
```

The runnable service additionally maps `NotFound` to `NotFoundException`, `InvalidArgument` to `BadRequestException`, and other failures to `ServiceUnavailableException`. Keep this mapping in an HTTP-facing layer so domain code does not depend on Nest exceptions. Add a web authentication guard and a guild-access guard before the controller can invoke privileged bot operations.

The entry point enables Nest shutdown hooks. Nest closes its HTTP server before `onApplicationShutdown`, so accepted requests can finish while the RPC client remains usable. The SDK's CommonJS export supports default Nest builds; the demo itself builds as ESM. Node must meet the client's engine range in either case.

## Hono

Run `pnpm example:hono`. Its [entry point](../examples/backends/hono/main.ts) creates the RPC client and passes it to [HonoDashboard](../examples/backends/hono/dashboard.application.ts). The application class owns route registration, error mapping and the Node HTTP server returned by `@hono/node-server`.

The `stats` method reads `guildId` from Hono's request context, calls `guild.stats` and serializes the DTO through `context.json`. Its error handler maps the same protocol statuses as the Nest example. Middleware for sessions and guild access belongs before this route. Keep the service token in process configuration, not in a request header received from dashboard users.

On SIGTERM or SIGINT, the entry point calls `dashboard.close()`. Closing stops the HTTP listener, waits for responses and releases the RPC client in `finally`. The close method returns the same shutdown promise on repeated calls. If you add background tasks, stop accepting new work before waiting for these resources to close.

## Fastify

Run `pnpm example:fastify`. The [entry point](../examples/backends/fastify/main.ts) creates a Fastify instance and an RPC client, then passes both to [FastifyDashboard](../examples/backends/fastify/dashboard.application.ts). The route's parameter type is declared separately in `interfaces/guild-stats-params.interface.ts`.

`FastifyDashboard.start()` registers the statistics route, error handler and shutdown hooks before listening. Route callbacks delegate to named methods. The application closes the RPC client through Fastify's `onClose` hook, after HTTP requests drain. If startup fails, it closes the partially initialized application before propagating the failure.

Use Fastify hooks or plugins for authentication and guild authorization. Keep the RPC client shared across those routes. If the backend has multiple plugins, inject or decorate the same application-owned client rather than creating another connection pool in each plugin.

## Status and request lifetime

The examples are read-only and use a small error mapping. A production API may need separate handling for authentication failures, permission failures, quotas and deadlines. Inspect `RpcClientError.code` and return messages appropriate for the HTTP caller; do not copy internal exceptions into HTTP responses.

Call options accept `timeoutMs` and `signal`. A signal from your HTTP framework can cancel downstream work when a request ends. Check that the signal represents client disconnection, rather than successful completion of a request body. The handler must cooperate with cancellation, and a canceled HTTP request does not prove that a Discord mutation was undone.

For readiness, expose a small application handler such as `system.health` with `routing: 'singleton'` and a read permission. Return only the dependencies your backend needs to judge ready. This is an application method; the package does not implement the standard gRPC Health service or an HTTP health route. Keep probes lightweight and give them a short deadline and an appropriate credential rate limit.

The lifecycle behavior follows the official [NestJS lifecycle](https://docs.nestjs.com/fundamentals/lifecycle-events), [Hono Node server](https://hono.dev/docs/getting-started/nodejs) and [Fastify onClose hook](https://fastify.dev/docs/latest/Reference/Hooks/#onclose).
