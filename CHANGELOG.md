# Changelog

## 0.10.1

A Spraxium bot can now start a call to your backend too. For example, the dashboard can still ask the bot for a server's member count. When someone runs `/ticket`, the bot can ask the backend to create the ticket and use the ID it gets back in its Discord reply.

The backend receives those calls with `@spraxium/rpc-server`. The new package runs in any supported Node.js app, including NestJS, Express, Fastify and Hono on Node. Both directions use the same client and the same v1 protocol. Give each gateway its own credential and register the methods that application owns.

Existing bot handlers, sharding and the NestJS-to-bot setup keep working. You can add the second gateway when you need it. The example runs both directions and shows where to initialize and close the clients and the gateway.

[NestJS example](examples/nestjs) · [Server README](packages/server) · [Two-way guide](https://spraxium.com/en/guide/rpc-nestjs-two-way)

## 0.10.0

This is the first npm release of Spraxium RPC. A backend can call a named provider method inside a Discord bot and get a JSON response. The bot handles Discord and the backend keeps its web routes, sessions and public URLs.

- `@spraxium/rpc` runs the authenticated gateway in the bot. With native sharding, the parent routes guild calls to the shard that owns them and drains the gateway on shutdown.
- `@spraxium/rpc-client` handles typed calls, deadlines and cancellation from Node.js. It supports ESM, CommonJS, Connect and gRPC.
- `@spraxium/rpc-protocol` contains the shared Protobuf schema and JSON codec.

The bot, HTTP backends, and standalone clients in [examples](examples) are written in TypeScript. The SDK examples still show both ESM and CommonJS entry points.

The bot adapter requires framework 0.10.0 and Discord.js 14.28.1 or a compatible 14.x version.

### Why we are deprecating HTTP

`@spraxium/http` combined the bridge to the bot with an HTTP framework. It meant maintaining controllers, routing, guards, middleware, CORS and request validation alongside the bridge. Projects that already run NestJS, Express or Hono often had the same pieces twice. Each security fix or change in web behavior gave us a second surface to maintain.

RPC lets your web framework own the public API and its access rules. Spraxium can focus on calling the bot, routing to Discord shards, and handling the connection while the bot starts and stops. Move an existing route one at a time. Keep its URL and move the call to the bot behind it.

- English · [Start using RPC](https://spraxium.com/en/guide/rpc-quickstart) · [Migrate from HTTP](https://spraxium.com/en/guide/rpc-http-migration)
- Português · [Comece com RPC](https://spraxium.com/pt/guide/rpc-quickstart) · [Migre do HTTP](https://spraxium.com/pt/guide/rpc-http-migration)
- Español · [Empieza con RPC](https://spraxium.com/es/guide/rpc-quickstart) · [Migra desde HTTP](https://spraxium.com/es/guide/rpc-http-migration)

If you use a coding agent, give it the [migration skill](SKILL.md) and the walkthrough for your language.
