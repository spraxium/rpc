# Contributing

Use the Node.js range in `package.json` and install dependencies with the pinned pnpm.

~~~sh
pnpm install --frozen-lockfile
pnpm check
~~~

Run `pnpm test:examples` for backend integrations and `pnpm test:interop` for changes to the transport. After changing the adapter or the framework hooks, use `pnpm test:framework` with a compatible framework fixture. The tests use local processes and no Discord login.

The bot adapter lives in `packages/spraxium`, the Node.js client in `packages/client` and the shared wire contract in `packages/protocol`. When editing `gateway.proto`, run `pnpm proto:generate` and commit the generated file with the schema. CI checks the committed v1 descriptor for incompatible changes.

Keep behavior with the class that owns it. Pass dependencies through constructors and document public methods with JSDoc. Use a Conventional Commit subject. Include the reason for the change and the checks you ran in the pull request. Report security issues privately as described in [SECURITY.md](SECURITY.md).
