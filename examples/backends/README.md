# RPC examples

One Discord bot and three backends share the same `guild.stats` contract. The bot requires a compatible local framework checkout; public framework 0.3.2 does not have the required integration hooks. See [compatibility](../../docs/framework-compatibility.md) and the [step-by-step tutorial](../../docs/getting-started.md).

One Discord bot with an injected guild service, and three independent HTTP backends consuming the same explicit [contract](./interfaces/bot-rpc-contract.interface.ts). The backend entry points import only the RPC client and their own HTTP framework. They can be deployed without Discord.js or any bot runtime dependencies by moving their source and the contract into their own repository.

## Run locally

From the monorepo root:

```bash
pnpm install --frozen-lockfile
pnpm example:prepare --framework ../framework
```

The preparation command builds and packs both repositories with their pinned pnpm versions. It installs the example in `.local/examples/` with matching framework/RPC archives, keeping workspace dependencies unchanged. Rerun preparation after source changes. The runner uses the last successfully prepared installation.

Copy the repository's `.env.example` to `.env`. Set `DISCORD_TOKEN`, a random `SPRAXIUM_RPC_TOKEN` of 32–4096 characters, and `SPRAXIUM_RPC_URL=http://127.0.0.1:4300`. Start the bot with `pnpm example:bot`. In another terminal start `pnpm example:hono`, `pnpm example:nest` or `pnpm example:fastify`. Choose one backend; each binds port 3000. The runner loads the root `.env` without overwriting variables already set by the shell. Existing `.env` files are preserved by preparation.

Request `GET http://127.0.0.1:3000/guilds/<guildId>/stats` for a guild the bot has joined. The controller awaits `guild.stats` and returns its DTO. No Discord.js objects leave the bot. The examples expose read-only routes for local demonstration; a deployed dashboard must authenticate users and check guild access in its backend.

Files:

- [bot/app.module.ts](./bot/app.module.ts): existing modules, constructor injection and RPC discovery.
- [bot/guild-rpc.service.ts](./bot/guild-rpc.service.ts): decorated, schema-validated guild handler.
- [hono/main.ts](./hono/main.ts): lightweight backend, error mapping and connection cleanup.
- [nest/dashboard.module.ts](./nest/dashboard.module.ts): client composition and injection; the service and controller live in their own files.
- [fastify/main.ts](./fastify/main.ts): explicit client/server composition, typed route parameters, error mapping and cleanup through `onClose`.
- [spraxium.config.ts](./spraxium.config.ts): authenticated bot listener.

## Shared client and framework integration

Each backend creates one long-lived `createRpcClient<BotRpcContract>` using `SPRAXIUM_RPC_URL` and `SPRAXIUM_RPC_TOKEN`. It calls `rpc.call('guild.stats', { guildId })`, which returns `{ members, premium, shardId }` with types inferred from the contract. The client's default timeout is bounded, and each call can override it with `{ timeoutMs: 3000 }` as a third argument. Tokens belong in the backend environment.

NestJS provides the client with a factory and injects it into `BotRpcService`. Hono's `HonoDashboard` and Fastify's `FastifyDashboard` receive the client through their constructors. All three translate RPC `NotFound` into HTTP 404, `InvalidArgument` into HTTP 400, and unavailable calls into HTTP 503. NestJS closes the client in `onApplicationShutdown`, after its HTTP server closes. Hono waits for its HTTP server to drain before closing the client; Fastify uses `onClose` for the same ordering.

These entry points follow the documented [NestJS lifecycle](https://docs.nestjs.com/fundamentals/lifecycle-events), [Hono Node.js server](https://hono.dev/docs/getting-started/nodejs) and [Fastify shutdown hook](https://fastify.dev/docs/latest/Reference/Hooks/#onclose).

For native sharding set `RPC_SHARDING=true` before starting the bot. The entry point enables `totalShards: 'auto'`; Discord resolves the count. The same route calls the guild's shard and includes `shardId` in the result. Use enough guilds/a permitted shard count when testing Discord itself. Automated tests exercise DI and real shard IPC without connecting to Discord.

## Two-container deployment

The Compose and Dockerfile describe the deployment topology. They currently resolve the public framework dependencies and cannot run the bot until a compatible framework release is available and pinned in the catalog. Use the prepared local installation above today. After updating and validating those framework versions, set `DISCORD_TOKEN` and `SPRAXIUM_RPC_TOKEN` in the shell or an uncommitted `.env` in this directory, then:

```bash
docker compose up --build
```

`discord-bot` and `dashboard-api` run in separate containers. Only the backend port is bound to host loopback. RPC port 4300 is not published. The bot has a separate egress network to reach Discord; both services share an internal RPC network. The API uses `http://discord-bot:4300`. Requests made before Discord and RPC are ready return HTTP 503; mutations are never retried automatically.

This example explicitly permits a plaintext hop on the private Docker network. For production traffic across hosts, terminate TLS directly in the bot or at a trusted proxy, isolate the backend connection and use `https://` in the client. Do not expose the plaintext port to public networks. A TLS proxy must support HTTP/2/h2c for the default client or use Connect with `httpVersion: '1.1'` at the TLS edge. Supply certificates as secrets rather than putting them in images.

To run NestJS or Fastify in the API container, change its command to `["node", "dist/nest/main.js"]` or `["node", "dist/fastify/main.js"]`. The bot and contract do not change. Set `RPC_SHARDING=true` for the bot container to run the same handler through native shard IPC.
