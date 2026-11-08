# Examples

Each integration has its own directory and package manifest. All examples use JavaScript and run directly with Node. The HTTP backends depend on the RPC client and their web framework; the bot owns Discord.js and Spraxium.

| Directory | Example | Root command |
| --- | --- | --- |
| [bot](bot/README.md) | Spraxium providers, schemas and shard routing | `pnpm example:bot` |
| [hono](hono/README.md) | Hono with its Node server | `pnpm example:hono` |
| [nestjs](nestjs/README.md) | NestJS module, service and controller | `pnpm example:nestjs` |
| [fastify](fastify/README.md) | Fastify route and shutdown hook | `pnpm example:fastify` |
| [express](express/README.md) | Express 5 route | `pnpm example:express` |
| [koa](koa/README.md) | Koa middleware | `pnpm example:koa` |
| [node-http](node-http/README.md) | Native Node HTTP server | `pnpm example:node-http` |
| [node-client](node-client/README.md) | ESM and CommonJS console clients | `pnpm example:node-client <guildId>` |

## Setup

Run `pnpm install --frozen-lockfile` and `pnpm build` from the repository root. Copy `.env.example` to `.env` and set `SPRAXIUM_RPC_URL` and `SPRAXIUM_RPC_TOKEN` for the gateway you will call. These are backend credentials, so keep them outside browser code. Node loads the root `.env` and preserves values already present in the shell.

The included bot additionally needs `DISCORD_TOKEN` and a [compatible framework build](../docs/framework-compatibility.md). Public Spraxium 0.3.2 lacks the adapter hooks. Install matching framework packages before running `pnpm example:bot`; building this repository alone does not supply those hooks. The HTTP and console examples can call an existing compatible bot without installing its framework.

The RPC token must contain 32–4096 printable ASCII characters without whitespace. Generate one with `node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"` and use the same value in the bot and backend configuration. The Discord token is a separate credential.

## HTTP backends

Start one backend with its root command. It listens on `HTTP_HOST=127.0.0.1` and `PORT=3000` by default. Set different ports to run several at once. All six expose `GET /guilds/<guildId>/stats` and return `{ members, premium, shardId }`. Use a guild the bot has joined.

Invalid guild IDs return 400, missing guilds return 404, and failed bot calls return 503. These routes demonstrate the RPC integration. Add session authentication and per-user guild authorization before exposing them to users.

Each backend creates one client and closes it after its HTTP listener drains. NestJS uses its application shutdown hook; the other entry points handle SIGINT and SIGTERM.

## Console clients

Run `pnpm example:node-client <guildId>` for ESM or `pnpm example:commonjs <guildId>` for CommonJS. Both print the same DTO and close the client after success or failure.

## TLS

Loopback HTTP works for local development. For a remote gateway, use HTTPS. The bot accepts absolute PEM paths through `SPRAXIUM_RPC_TLS_CERT` and `SPRAXIUM_RPC_TLS_KEY`. With a private CA, set `NODE_EXTRA_CA_CERTS` to its certificate before starting the Node client. Certificate verification remains enabled.

If a trusted proxy terminates TLS, isolate the plaintext hop and explicitly configure `SPRAXIUM_RPC_TLS_PROXY=true` on the bot. A client using a private plaintext network must opt in with `SPRAXIUM_RPC_PRIVATE_NETWORK=true`; that setting does not encrypt traffic.

## Checks

`pnpm test:examples` builds the packages and tests the JavaScript sources against a local RPC gateway. It covers all six HTTP backends, ESM/CommonJS clients and native bot injection without a Discord connection or a real token. `pnpm test:interop` checks the gRPC transport separately.

See the [tutorial](../docs/getting-started.md) for the bot setup and the [backend guide](../docs/backends.md) for resource ownership and error mapping.
