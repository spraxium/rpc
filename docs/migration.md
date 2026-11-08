# Extraction from the framework monorepo

The RPC implementation, tests, canonical schema and NestJS/Hono/container examples now belong to this independent repository. The main framework keeps its generic module integration and graceful shutdown hooks, CLI support for installing the external RPC package, and the RPC bot template. It does not own or publish RPC packages.

| Previous location | Current owner |
| --- | --- |
| `framework/packages/rpc-protocol` | `spraxium-rpc/proto` and `packages/protocol` |
| `framework/packages/rpc-client` | `spraxium-rpc/packages/client` |
| `framework/packages/rpc` | `spraxium-rpc/packages/spraxium` |
| `framework/apps/rpc-demo` | `spraxium-rpc/examples/backends` |
| `framework/tests/rpc-packages` | RPC package installation checks and explicit framework compatibility suite |

Package names, handler decorators, configuration and v1 transport messages stay the same. Register the bot adapter with `imports: [RpcModule]`, following `ScheduleModule` and the other framework plugins. Configure it with `defineRpc(...)` in the plugins array. The framework remains independent of RPC.

## Local NestJS and slash-command example

The sibling `rpc-test/` project demonstrates NestJS and slash commands sharing a bot service over RPC. Its preparation script packs runtime/CLI from `framework/` and RPC from `spraxium-rpc/`. It uses pnpm 12.14.0 and reads the framework's package-manager version from its `package.json` for framework builds.

```bash
cd ../rpc-test
pnpm framework:build
pnpm install
pnpm test
```

Existing `.env` files are preserved. Real Discord interaction still requires the user's bot token and test guild ID. Automated tests use real NestJS/Spraxium processes with a simulated Discord gateway and interactions.

## Hosting and publishing

Before publishing, configure the repository remote, cross-repository documentation links and package `repository` metadata.

Before the first public adapter release, publish the compatible framework hooks and finalize peer ranges as described in [framework compatibility](framework-compatibility.md). Keeping the old npm package name does not make the currently published framework compatible.
