# Framework compatibility

Applications register the RPC plugin with `@Module({ imports: [RpcModule] })` and `defineRpc(...)` in the plugins array. The global module registers native DI providers. Its internal lifecycle bridge requires these framework capabilities:

- `@Module({ integrations: [...] })` and application-scoped integration setup.
- Discovery of actual DI instances through `onInstance`.
- `onApplicationReady` after every provider's ready hook.
- Integration shutdown before provider teardown.
- Awaited parent shutdown hooks before shard termination.

The local framework checkout implements these hooks. The public framework 0.3.2 source, verified at commit `4803b0c46395ccc4b0422beb0d9440bd1101701d`, does not contain module integrations or awaited parent shutdown. Use a compatible local framework build when running the adapter. No compatible public release is currently recorded in [compatibility/framework.json](../compatibility/framework.json).

Development dependencies use published packages so the independent SDK/transport work can build in a fresh clone. The adapter checks the parent shutdown capability at setup/start and fails with an actionable message on the old runtime. Its explicit lifecycle contract remains structurally compatible with the new framework's public interface. The check is a guard, not a replacement for the complete compatibility suite.

```bash
pnpm test:framework --framework ../framework
```

This builds the framework with its pinned pnpm, packs logger/env/common/core and RPC, and installs them in `.local/framework-tests/`. The suite checks DI discovery, bot/client processes and shard IPC. Local archives remain outside the normal lockfile.

Before publishing `@spraxium/rpc`, release the framework hooks, replace its broad provisional peer ranges with the actual compatible versions, update the development catalog and run this compatibility gate plus the independent checks. Protocol/client packages do not require the framework runtime.

`pnpm release:check` and the adapter's `prepublishOnly` lifecycle deliberately fail until that record contains an immutable framework commit and matching peer ranges. Keep the dependency ranges provisional while the adapter is unpublished; a version number by itself is not evidence that the hooks exist. Release status must be updated after the real framework release, never inferred from the local package version.

The framework compatibility workflow runs on pushes and pull requests. Once the verified reference is recorded, it checks out that exact commit and executes the process tests automatically. Before that, its summary reports the unavailable public dependency and skips the cross-repository job. Maintainers can test an exact framework commit manually with `workflow_dispatch`. The local process suite remains available with the command above.

Use `pnpm example:prepare --framework ../framework` to install matching development archives for the NestJS, Hono and Fastify examples. This is an explicit local workflow and does not change the repository's lockfile or publish any package.
