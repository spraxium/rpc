# Releases

RPC packages have an independent release lifecycle. The workspace root is private; packages use Apache-2.0 and public npm access. Publishing is manual. No RPC package is published to npm yet.

Keep the three TypeScript package versions aligned initially so an installation resolves the matching shared protocol. The v1 wire namespace is independent of these versions. A future separately maintained language SDK may use its own SemVer while preserving the same conformance contract.

Release procedure:

1. Run `pnpm install --frozen-lockfile`, `pnpm check` and `pnpm test:java`.
2. For the adapter, release the framework hooks first and run `pnpm test:framework --framework PATH` against that exact source. Record its immutable commit and verified peer ranges in `compatibility/framework.json`, update the adapter peers and development catalog, then run `pnpm release:check`. The adapter's `prepublishOnly` gate rejects publication until this record is complete. See [compatibility](framework-compatibility.md).
3. Review package contents and consumer installations, update versions and release notes explicitly, then commit/tag through the repository's normal review process.
4. Publish protocol, client and adapter in dependency order using the registry's trusted publishing/provenance configuration. Configure the actual repository URL and package registry ownership first.

CI checks and archive installation tests run without publishing credentials.

The protocol and client do not depend on the framework and can be released independently of its hooks. Keep the adapter unpublished while its required framework release is unavailable. The compatibility workflow starts testing the recorded framework commit on every push and pull request once the record is set.
