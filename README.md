# Spraxium RPC

Call bot services from a separate Node.js backend over Connect or gRPC. Handlers use the bot's existing providers, and guild requests go to the owning shard.

The packages are in development and have not been published to npm. The bot adapter needs framework hooks that public Spraxium 0.3.2 does not provide. See [framework compatibility](docs/framework-compatibility.md) before starting the bot. The client and protocol work independently of the framework.

## Packages

| Package | Purpose |
| --- | --- |
| [`@spraxium/rpc-protocol`](packages/protocol/README.md) | Protobuf descriptors and JSON codec |
| [`@spraxium/rpc-client`](packages/client/README.md) | Node.js client with ESM and CommonJS exports |
| [`@spraxium/rpc`](packages/spraxium/README.md) | Spraxium plugin, handler discovery and shard routing |

Only the bot adapter depends on Discord.js and Spraxium. The client uses ConnectRPC and the shared protocol. There is no separate HTTP framework, broker or database in the RPC runtime.

## Examples

Use Node.js `>=22.23.2 <27` and pnpm 12.14.0.

```bash
pnpm install --frozen-lockfile
pnpm build
```

The [examples](examples/README.md) are JavaScript projects for Hono, NestJS, Fastify, Express, Koa, Node HTTP and standalone ESM/CommonJS clients. Each runs directly with Node. For example, with a compatible bot already running, set `SPRAXIUM_RPC_URL` and `SPRAXIUM_RPC_TOKEN` in the root `.env` and start Hono:

```bash
pnpm example:hono
```

The endpoint is `GET http://127.0.0.1:3000/guilds/<guildId>/stats`. See the [tutorial](docs/getting-started.md) to configure the bot and register its `guild.stats` handler.

## Plugin registration

Import `RpcModule` in your application module and add `defineRpc(...)` to the framework's plugins array.

```javascript
import { Module } from '@spraxium/common';
import { RpcModule } from '@spraxium/rpc';

export class AppModule {}

Module({ imports: [RpcModule] })(AppModule);
```

```javascript
import { defineConfig } from '@spraxium/core';
import { defineRpc } from '@spraxium/rpc';

export default defineConfig({
  plugins: [defineRpc({
    token: process.env.SPRAXIUM_RPC_TOKEN ?? '',
    permissions: ['guild:read'],
  })],
});
```

The default address is `127.0.0.1:4300`. Startup rejects missing or invalid credentials. Handlers declare their own permissions and can validate input and output with synchronous schemas.

## Development

```bash
pnpm check
pnpm test:examples
pnpm test:interop
```

`check` covers formatting, types, builds, protocol compatibility, unit/network tests and installation of packed client packages. The example suite runs six HTTP backends, ESM/CommonJS clients and the bot's JavaScript provider registration without logging into Discord. The interoperability suite exercises gRPC against the real gateway.

Read [CONTRIBUTING.md](CONTRIBUTING.md) for commit rules and checks, the [backend guide](docs/backends.md) for integrations, and the [HTTP migration guide](docs/http-migration.md) when replacing `@spraxium/http`.

## License

[Apache-2.0](LICENSE). See the [Code of Conduct](CODE_OF_CONDUCT.md) and [Security Policy](SECURITY.md).
