# Contributing

Use the Node.js range in `package.json` and install dependencies with the pinned pnpm.

~~~sh
pnpm install --frozen-lockfile
pnpm check
~~~

Run `pnpm test:examples` for backend integrations and `pnpm test:interop` for changes to the transport. After changing the adapter or the framework hooks, use `pnpm test:framework` with a compatible framework fixture. The tests use local processes and no Discord login.

The bot adapter lives in `packages/spraxium`, the Node.js client in `packages/client` and the shared wire contract in `packages/protocol`. When editing `gateway.proto`, run `pnpm proto:generate` and commit the generated file with the schema. CI checks the committed v1 descriptor for incompatible changes.

Keep behavior with the class that owns it. Pass dependencies through constructors and document public methods with JSDoc. Use a Conventional Commit subject. Include the reason for the change and the checks you ran in the pull request. Report security issues privately as described in [SECURITY.md](SECURITY.md).

## npm release

Run the **Publish RPC** workflow on `main` with the version in the package manifests. The `prepare` option builds, tests, and uploads all three `.tgz` files as a workflow artifact.

Publish the matching Spraxium framework version first. For the first RPC release, use the `stage` option with `NPM_STAGE_TOKEN`, an npm token that can stage new packages in the `@spraxium` scope. A maintainer approves the staged packages in npm in this order: `@spraxium/rpc-protocol`, `@spraxium/rpc-client`, and `@spraxium/rpc`. For subsequent releases, `publish` uses the trusted publisher configured on each npm package for `spraxium/rpc` and `release.yml`.

Keep the three RPC packages at the same version. Use `pnpm changeset` to record a change and `pnpm version` to apply the plan when cutting a new version. The first-release note uses `none` because the 0.10.0 version is already assigned. The per-package changelogs cover that release.
