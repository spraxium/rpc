# Framework compatibility

The adapter registers through `RpcModule` and `defineRpc(...)`. It needs application-scoped module integrations, access to constructed provider instances, an application-ready hook after providers finish starting, integration shutdown before provider teardown, and awaited parent shutdown before shard termination.

The compatible local framework checkout implements those hooks. Public framework 0.3.2 does not provide all of them, as recorded in [compatibility/framework.json](../compatibility/framework.json). No compatible public release is recorded yet. The framework's package version alone is not proof of compatibility.

The repository uses published development dependencies so a fresh clone can build and test the client, protocol and transport. That does not make the included bot runnable on the old framework. The adapter checks a required parent shutdown capability and rejects the old runtime with a configuration error.

## Local integration

Build the compatible framework checkout with its pinned package manager. Pack and install its matching `logger`, `env`, `common` and `core` packages together with the RPC packages in a separate application. Keep one resolved copy of the framework and Discord.js across that application: constructor identity matters to injection.

The process tests in `packages/spraxium/test/process.test.ts` exercise built imports, provider discovery and native shard IPC. Their default fixture uses the installed public module loader and explicitly supplies the integration host. It tests the RPC contract without claiming that the old framework automatically runs the missing hooks.

```bash
pnpm build
pnpm test:framework
```

To run those process checks against a compatible application's fixture, set `RPC_FRAMEWORK_FIXTURE` to its absolute entry-point path. The fixture must handle the test IPC messages used by the existing fixture. This command does not build, install or modify an external framework checkout.

## Publishing

Before publishing the adapter, release the required framework hooks and validate an application using that release. Record the immutable framework commit and matching peer ranges in `compatibility/framework.json`, update the adapter's peer dependencies and workspace catalog, and run the process and example suites.

The adapter's `prepublishOnly` check rejects publishing until the compatibility record contains a full commit SHA and peer ranges matching its manifest. Protocol and client releases do not require the framework runtime. See [releases](releases.md).
