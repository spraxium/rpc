# Spraxium RPC

Call bot services from a separate backend over Connect or gRPC. Handlers use the same dependency injection instances as the bot's commands. In sharded bots, the parent routes each guild request to its owning shard.

The implementation is in development. The public Spraxium framework does not yet expose all required lifecycle hooks, and the RPC packages have not been released to npm. Use a compatible local framework checkout for the bot adapter. The client and protocol run independently of the framework.

## Workspace

| Package | Directory | Responsibility |
| --- | --- | --- |
| `@spraxium/rpc-protocol` | `packages/protocol` | Transport descriptors and JSON contract |
| `@spraxium/rpc-client` | `packages/client` | Typed Node.js client |
| `@spraxium/rpc` | `packages/spraxium` | Handler discovery and native shard integration |

The runtime uses Node's HTTP/2, crypto and process APIs through the Connect transport. It does not start a separate HTTP framework or broker. The client installs neither Discord.js nor the Spraxium runtime. Zod, NestJS, Hono and Fastify belong to the examples.

## Try the examples

Use Node.js `>=22.23.2 <27` and pnpm 12.14.0. The compatible framework checkout may require a newer patch version; Node 24.22.1 or 26.12.1 satisfies the local framework's requirements.

```bash
pnpm install --frozen-lockfile
pnpm example:prepare --framework ../framework
```

Copy `.env.example` to `.env` and fill in the Discord bot token and a random RPC token of 32–4096 characters. Generate the RPC token with `node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"`. Existing environment variables take precedence over this file.

```bash
pnpm example:bot
```

In another terminal, run `pnpm example:nest`, `pnpm example:hono` or `pnpm example:fastify`. Each backend listens on port 3000, so choose one. Request `/guilds/<guildId>/stats` for a guild the bot has joined. The [example README](examples/backends/README.md) explains the processes, variables and cleanup.

## Plugin registration

Register the bot adapter like the framework's schedule plugin: import `RpcModule` in the application module and configure `defineRpc(...)` in the plugins array.

```typescript
import { Module } from '@spraxium/common';
import { RpcModule } from '@spraxium/rpc';

@Module({ imports: [RpcModule] })
export class AppModule {}
```

The module registers its providers through native DI and discovers `@RpcHandler` methods in feature modules. Configuration uses the same `definePlugin` and `ConfigStore` mechanism as `defineSchedule`.

```typescript
import { defineConfig } from '@spraxium/core';
import { defineRpc } from '@spraxium/rpc';

export default defineConfig({
  plugins: [defineRpc({
    token: process.env.SPRAXIUM_RPC_TOKEN ?? '',
    permissions: ['guild:read'],
  })],
});
```

This listens on `127.0.0.1:4300` after the bot's providers are ready. Missing or invalid credentials stop startup. Handlers declare their own permissions and optional synchronous input/response schemas. The [integration tutorial](docs/getting-started.md) walks through a handler, the shared contract and the backend client.

## Development

```bash
pnpm check
pnpm test:framework --framework ../framework
pnpm test:java
```

`check` verifies formatting, types, builds, protocol compatibility, unit/network tests and fresh ESM/CommonJS client installations. Framework tests install packed archives and exercise separate bot/client processes and native shard IPC. Java tests require JDK 17+ and Maven 3.9+.

## Contributing

Read the [integration tutorial](docs/getting-started.md), [backend guide](docs/backends.md), [HTTP migration](docs/http-migration.md), [compatibility requirements](docs/framework-compatibility.md) and [maintenance guide in Portuguese](docs/maintenance.pt-BR.md).

See [CONTRIBUTING.md](CONTRIBUTING.md) for setup, commit rules and implementation checks. Community participation follows the [Code of Conduct](CODE_OF_CONDUCT.md). Security reports follow the [Security Policy](SECURITY.md).

## License

[Apache-2.0](LICENSE).
