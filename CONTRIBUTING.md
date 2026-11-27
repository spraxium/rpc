# Contributing

Use the Node.js range in `package.json` and install dependencies with the pinned pnpm.

~~~sh
pnpm install --frozen-lockfile
pnpm check
~~~

Run `pnpm test:examples` for backend integrations and `pnpm test:interop` for changes to the transport. After changing the adapter or the framework hooks, use `pnpm test:framework` with a compatible framework fixture. The tests use local processes and no Discord login.

The bot adapter lives in `packages/spraxium`, the standalone gateway and shared server runtime in `packages/server`, the Node.js client in `packages/client`, and the wire contract in `packages/protocol`. When editing `gateway.proto`, run `pnpm proto:generate` and commit the generated file with the schema. CI checks the committed v1 descriptor for incompatible changes.

Keep behavior with the class that owns it. Pass dependencies through constructors and document public methods with JSDoc. Use a Conventional Commit subject. Include the reason for the change and the checks you ran in the pull request. Report security issues privately as described in [SECURITY.md](SECURITY.md).

## npm release

A push to `main` that changes the package manifests starts **Publish RPC**. The workflow tests and packs the version in the manifests, then submits the packages that npm does not have yet. For a manual archive check, run the workflow with `prepare`.

Publish the compatible framework version first. Each RPC package uses npm trusted publishing for `spraxium/rpc` and `release.yml`. An npm scope maintainer needs to create a new package before setting up its trusted publisher. For an existing package, the `stage` option leaves approval to a maintainer.

Keep the RPC packages at the same version. Use `pnpm changeset` to record a change and `pnpm version` to apply the plan when cutting a new version. Release notes for versions already assigned in the manifests use `none` so Changesets does not bump them again.
