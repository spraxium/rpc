# Spraxium RPC

RPC packages for the Spraxium ecosystem, with a Protobuf gateway over Connect and gRPC, a standalone Node.js client and a Spraxium framework adapter.

## Workspace

| Package | Directory | Responsibility |
| --- | --- | --- |
| `@spraxium/rpc-protocol` | `packages/protocol` | Transport descriptors and JSON contract |
| `@spraxium/rpc-client` | `packages/client` | Typed Node.js client |
| `@spraxium/rpc` | `packages/spraxium` | Handler discovery and native shard integration |

The workspace uses pnpm catalogs for shared dependencies, TypeScript and tsdown for builds, Biome for formatting, Vitest for tests and Buf for protocol checks.

## Repository Setup

Use Node.js `>=22.23.2 <27` and pnpm 12.14.0. Node 24 is the development default.

```bash
pnpm install --frozen-lockfile
pnpm lint
```

Installation enables Husky hooks. Staged files are checked before commits, and commit messages follow the same emoji-based Conventional Commits format as the Spraxium framework:

```text
🔧 chore(repo): configure workspace tooling
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for setup, commit rules and implementation checks. Community participation follows the [Code of Conduct](CODE_OF_CONDUCT.md). Security reports follow the [Security Policy](SECURITY.md).

## License

[Apache-2.0](LICENSE).
