# Releases

The workspace root is private. The three packages use Apache-2.0 and are configured for public npm access, but none has been published yet. Publishing is a separate maintainer action.

Run `pnpm check`, `pnpm test:examples` and `pnpm test:interop` before a release. Review version changes, dependency ranges and package contents. `pnpm --filter @spraxium/rpc-protocol pack` and `pnpm --filter @spraxium/rpc-client pack` create the archives with the standard package manager. The installation test included in `pnpm check` verifies an isolated client installation and its ESM/CommonJS exports.

Keep package versions aligned while the client and adapter depend on the same protocol release. The `spraxium.rpc.v1` wire namespace is independent of npm versions. Adding an application handler does not require a new transport namespace.

The adapter must remain unpublished until its framework hooks have a verified release. Run the integration tests against that build, record its commit and peer ranges in `compatibility/framework.json`, and update the adapter peers and development catalog. Its `prepublishOnly` check blocks publication while the record is incomplete. See [framework compatibility](framework-compatibility.md).

After review, publish protocol, client and adapter in dependency order using the registry's configured credentials and provenance. CI and package-installation checks do not need publishing credentials.
