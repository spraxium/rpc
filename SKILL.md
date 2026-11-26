---
name: migrate-spraxium-http-to-rpc
description: "Migrate an existing Spraxium Discord bot from @spraxium/http or BotBridge to @spraxium/rpc while preserving its public routes, authorization, and responses. Use when moving calls into an existing Node.js backend."
---

# Migrate Spraxium HTTP to RPC

Use this skill when an existing Spraxium Discord bot uses `@spraxium/http`, `BotBridge`, or HTTP controllers that need to move to Spraxium RPC. The expected result is a working migration of the selected routes. Preserve the web API and its access checks while moving the calls that actually need the bot.

## Read the application and its docs first

Start with the bot and backend manifests, lockfiles, launch commands, module tree, configuration, environment schema, and current HTTP tests. Identify which process receives the public request and which process owns Discord.js. In a monorepo those may be different workspace projects. Locate the browser client or API contract when a backend route is already consumed.

Search the Spraxium site for the current migration advice in the user's language. Search `site:spraxium.com` with the package and feature you found, then open the relevant pages. Start with the migration guide and use the quickstart for signatures and versions. Read the credentials, sharding, or backend guide when the project uses those features. If the site shows examples from a different release, use the docs and public types for the version installed or explicitly targeted by the user. Check the registry or the workspace before raising versions. [English migration](https://spraxium.com/en/guide/rpc-http-migration) · [Migração em português](https://spraxium.com/pt/guide/rpc-http-migration) · [Migración en español](https://spraxium.com/es/guide/rpc-http-migration)

For a local candidate, check the tested framework ref and exact peer ranges in `compatibility/framework.json`. The 0.10.0 adapter needs a compatible framework with integration and shutdown hooks. Keep `@spraxium/common`, `@spraxium/core` and `@spraxium/logger` compatible and check which copies the application resolves. Read the existing Node and package manager requirements before updating the lockfile. [Quickstart](https://spraxium.com/en/guide/rpc-quickstart) · [Compatibility record](https://github.com/spraxium/rpc/blob/main/compatibility/framework.json)

## Find the routes and their real contracts

From the application root, find references to the old package, bridge and decorators. Inspect package manifests, module metadata, configuration, tests and deploy rules for the same feature. The search can point to code that is only kept for another workspace or another stage of the rollout.

~~~sh
rg -n '@spraxium/http|BotBridge|HttpClientModule|HttpModule|defineHttp|HttpGuards|HttpUseMiddleware|HttpController|Http(Get|Post|Put|Patch|Delete)' -g '!**/node_modules/**' -g '!**/dist/**' .
~~~

For each route in scope, record which caller uses it, the verb and URL, parameters and body, validation, public response and status codes. Trace both route-level and global guards through to authentication, guild access, rate limits, CORS and proxy rules. Preserve the current error contract unless the request changes it. Inspect environment variable names and configuration schemas without putting secret values or private payloads in output.

For a signed webhook, preserve its path and request limits through the public proxy. Verify the original body bytes and signed headers before a general JSON parser consumes the body. Keep any separate authentication branches for webhooks and browser sessions. Test a valid and invalid signature through the same ingress with a local or staging fixture.

Start with a read when you can choose the order. A good first route already has a test or a predictable response. A panel route that only reads its own database can move to the backend without adding a call to the bot. A route that needs Discord data should call a named bot method. Keep session checks, API keys that protect public routes, response headers and file processing in the HTTP backend. Move the code that owns Discord state into a bot provider or call the provider the bot already has.

## Wire the bot to one method

Install the adapter in the bot. Add a `defineRpc` entry to the existing plugins and import `RpcModule` in the root module. Register the new handler as a provider in the feature that owns it. Use an existing service through dependency injection when it already enforces project rules. Keep Discord client and permission logic in the bot so commands and RPC calls share the same behavior.

Use names that describe an operation, such as `guild.get` or `guild.stats`. Guild routing needs `guildId` as a string at the top level, and schemas must keep that ID. Use singleton routing for an operation with one owner, such as a health check. Return plain JSON with the fields the backend needs. Never put the full Discord client or objects with methods on the wire. Add input and response schemas when the shape needs runtime checks.

This example preserves a read that used `BotBridge.getGuild`, checked for a missing guild, and returned its ID and name. Keep your project's result shape and lookup behavior when you adapt it.

~~~ts
import { Inject, Injectable } from '@spraxium/common';
import { Code, RpcError, RpcHandler } from '@spraxium/rpc';
import { Client } from 'discord.js';

@Injectable()
export class GuildRpcService {
  constructor(@Inject(Client) private readonly discord: Client) {}

  @RpcHandler('guild.get', { routing: 'guild', permissions: ['guild:read'] })
  get({ guildId }: { guildId: string }) {
    const guild = this.discord.guilds.cache.get(guildId);
    if (!guild) throw new RpcError('Guild not found.', Code.NotFound);
    return { id: guild.id, name: guild.name };
  }
}
~~~

Give the backend's credential `guild:read` in the gateway configuration. If more than one service calls the bot, use separate entries under `auth.tokens`. Authenticate the signed-in user at the HTTP boundary. Apply guild authorization there when the backend has the data to enforce it. When the existing check depends on state only the bot can see, preserve the check in the bot and use the actor identity verified by the backend. Derive that identity from the session or trusted caller context. The service token identifies the backend, and the bot still checks its Discord permissions and role hierarchy. [Handlers](https://spraxium.com/en/guide/rpc-handlers) · [Credentials and TLS](https://spraxium.com/en/guide/rpc-authentication) · [Sharding](https://spraxium.com/en/guide/rpc-sharding)

## Keep the public route where it belongs

Install `@spraxium/rpc-client` in the Node backend. Create one client during application setup, use the existing environment validation, and inject or pass the client to the route or service. Use credentials from the server's secret store and an HTTPS gateway URL when the processes are on different hosts. Preserve the current public path, method and response. Pass the request's cancellation signal where the HTTP adapter exposes one. Leave enough time between the RPC deadline and the outer HTTP deadline to send a response.

Translate `RpcClientError.code` at the web boundary. A typical read uses 400 for invalid input and 404 for a guild the service cannot find. Preserve 422 or a different status if the existing API uses it. Distinguish a denied browser session from a service token rejected by the gateway. A failed service credential is an upstream setup issue and can be reported as unavailable with sanitized server logs. Use the route's existing 503 or 504 policy for unavailable or timed-out calls. Return public error details only.

### NestJS

Use the existing feature module and keep its `@Controller`, guards, pipes and validation. Register a factory provider for the client with an injection token and inject it into a singleton service. The controller calls that service. Use the existing exception filter or Nest HTTP exceptions at the web boundary. Close the client in `onApplicationShutdown` and enable shutdown hooks at bootstrap for process signals. If the app uses Nest's Fastify adapter, let Nest continue to own controller routing and shutdown. [Runnable NestJS example](https://github.com/spraxium/rpc/tree/main/examples/nestjs/src) · [NestJS providers](https://docs.nestjs.com/fundamentals/custom-providers) · [NestJS lifecycle](https://docs.nestjs.com/fundamentals/lifecycle-events)

### Express

Use the existing `Router` and preserve the order of session and access middleware. Pass the client into the router at composition time. In Express 5, a rejected async handler reaches the four-argument error middleware after the routes. In Express 4, use the existing async wrapper or pass rejected promises to `next(error)`. Drain the returned HTTP server before closing the SDK. [Runnable Express example](https://github.com/spraxium/rpc/tree/main/examples/express/src) · [Express error handling](https://expressjs.com/en/guide/error-handling.html)

### Hono

Mount a router with `app.route()` and keep session and guild middleware before the RPC call. If the app uses `HTTPException` or an existing `onError` handler, preserve its handling of local HTTP errors and add RPC mapping there. Pass `context.req.raw.signal` when using the Node adapter. The SDK in this release needs Node's transports. When Hono runs in Workers or Edge, put the Spraxium SDK in a Node backend and keep the web runtime talking to that backend. [Runnable Hono example](https://github.com/spraxium/rpc/tree/main/examples/hono/src) · [Hono Node adapter](https://hono.dev/docs/getting-started/nodejs)

### Fastify

Register a plugin with the client in its options or use an existing Fastify decorator if the app already supplies clients that way. Keep the route's JSON Schema, serializer, and authorization hook. Use `setErrorHandler` for known RPC failures while preserving local validation errors. Close the shared client in the owning application's `onClose` hook after in-flight requests have drained. [Runnable Fastify example](https://github.com/spraxium/rpc/tree/main/examples/fastify/src) · [Fastify plugins](https://fastify.dev/docs/latest/Reference/Plugins/) · [Fastify validation](https://fastify.dev/docs/latest/Reference/Validation-and-Serialization/)

### Koa

Use the project's router. With `@koa/router`, mount `routes()` followed by `allowedMethods()`. Keep session and guild checks before the route and catch RPC failures in the existing upstream `try { await next() }` middleware. Use `context.body` and the API's current status mapping. Close the client when the application's HTTP server drains. [Runnable Koa example](https://github.com/spraxium/rpc/tree/main/examples/koa/src) · [Koa router](https://github.com/koajs/router)

### Node HTTP

Keep method and path matching in `node:http`, call the client in the selected handler and return JSON with the existing headers and status. To cancel an in-progress call, abort it on the response's `close` event only if the response has yet to end. Remove the listener when the handler completes. Close the client after `server.close()` finishes. [Runnable Node HTTP example](https://github.com/spraxium/rpc/tree/main/examples/node-http/src) · [Node HTTP API](https://nodejs.org/api/http.html)

### Next.js

Use a server-only module for the client and keep the call in a Route Handler or another supported Node server entry point. On current App Router releases, declare `export const runtime = 'nodejs'` if the route might inherit Edge and await dynamic route `params` where required. Read the session on the server and check the guild before calling RPC. Match the project's caching and deployment model. In serverless deployments, lifecycle hooks differ from a persistent HTTP server. [Next.js Route Handlers](https://nextjs.org/docs/app/getting-started/route-handlers) · [Backend transport options](https://spraxium.com/en/guide/rpc-backends)

## Verify the move and clean up after cutover

1. Run the existing build and checks in both projects. Exercise the new route against a real local gateway when possible. For tests that cannot log into Discord, use a fixture or mock the bot's Discord operation. Keep an integration check for what the route sends and what it returns.
2. Compare success and failure responses with the old contract. Cover invalid parameters, missing session, forbidden guild access, a missing Discord object, a missing or denied service credential, and a stopped gateway. For sharded projects, include a guild on another shard and verify errors map to the expected HTTP response.
3. Protect writes before moving them. A timeout does not tell you whether Discord accepted the operation. If a caller can retry across the cutover or rollback, make both paths honor the same operation or event ID and completion check. Test concurrent duplicates and a timeout after the operation takes effect. Send a mutation down one path during the rollout. For a read, switch the backend or proxy after comparing results.
4. Keep the old route while the rollout still needs it. Once the last route in scope uses RPC, remove unused old controllers, metadata, guards and imports. Remove `HttpModule`, `defineHttp`, the dependency and its configuration only where no consumer needs them. Refresh the lockfile, search again and check deploy configuration, tests and any external caller docs. Keep a working rollback path while the change rolls out.

Report which routes moved, where the bot handler and web route now live, how authorization and errors are preserved, commands you ran, and the pieces that still need a deployment or credential change. Git pushes, registry changes, and deployment require the user's authorization. [Troubleshooting](https://spraxium.com/en/guide/rpc-troubleshooting) · [Existing HTTP docs for reference](https://spraxium.com/en/guide/http-overview)
