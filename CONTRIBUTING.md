# Contributing to Spraxium RPC

## Code of Conduct

Read and follow the [Code of Conduct](CODE_OF_CONDUCT.md).

## Getting Started

Requirements:

- Node.js `>=22.23.2 <27`; Node 24 is the development default.
- pnpm 12.14.0, as pinned in `package.json`.
- JDK 17+ and Maven 3.9+ for Java interoperability checks.

```bash
git clone https://github.com/spraxium/rpc.git
cd rpc
pnpm install --frozen-lockfile
```

Installation sets up Husky. The pre-commit hook checks staged files with Biome; the commit-msg hook validates the commit message. CI also validates formatting and commit messages.

## Project Structure

| Directory | Responsibility |
| --- | --- |
| `packages/protocol` | Protobuf descriptors and JSON codec |
| `packages/client` | Standalone Node.js RPC client |
| `packages/spraxium` | Spraxium framework adapter |
| `proto` | Canonical cross-language transport schema |
| `examples` | Backend and Java reference applications |
| `tests` | Cross-language interoperability checks |
| `.github` | Repository checks and pull request template |
| `.husky` | Local commit hooks |

## Development Workflow

1. Create a branch from `main` for the change.
2. Keep changes focused on the relevant package or repository tooling.
3. Run `pnpm lint` before committing.
4. For implementation changes, run `pnpm check` to build packages and validate types, tests, schema compatibility and package archives.
5. For adapter changes, also run `pnpm test:framework --framework PATH` with a compatible framework checkout. For transport changes, run `pnpm test:java`.
6. Commit using the convention below and open a pull request against `main`.

Keep one class per production file and dependencies explicit in constructors. Interfaces and types belong in their own files. Use `Array<T>` and `ReadonlyArray<T>`; prefer `unknown` to `any`.

The client must remain independent of Discord.js and the framework runtime. Keep `proto/` as the canonical schema and regenerate bindings with `pnpm proto:generate`. Preserve public imports and wire compatibility. Run packaging and tests that consume those builds sequentially, since prepack can rebuild dependencies.

## Commit Convention

This repository follows the framework's commitlint configuration:

```text
<emoji> <type>(<scope>): <short description>
```

An emoji, allowed type, nonempty scope and description are required. The header must not exceed 200 characters. Emoji shortcodes such as `:sparkles:` are also accepted by the framework parser.

| Emoji | Type | When to use |
| --- | --- | --- |
| ✨ | `feat` | New feature |
| 🐛 | `fix` | Bug fix |
| 📝 | `docs` | Documentation only |
| ♻️ | `refactor` | Code change without a feature or fix |
| ✅ | `test` | Adding or updating tests |
| 🔧 | `chore` | Build process, tooling and dependencies |
| ⚡️ | `perf` | Performance improvement |
| 🔒️ | `security` | Security fix or hardening |
| 🚀 | `release` | Release or version bump |
| 💥 | `breaking` | Breaking change |

Use `protocol`, `client` or `spraxium` for package scopes, `examples` for reference applications, and `repo` for workspace tooling.

```text
✨ feat(client): support per-call deadlines
🐛 fix(spraxium): drain active calls before shutdown
📝 docs(protocol): document payload encoding
🔧 chore(repo): configure workspace tooling
```

Validate the latest commit locally with:

```bash
pnpm commitlint --last --verbose
```

## Submitting a Pull Request

- Keep each pull request focused on one feature, fix or tooling change.
- Reference related issues with `Closes #123` where applicable.
- Describe the resulting behavior and the checks performed.
- Update documentation when public behavior changes.
- Review API and protocol compatibility before proposing a breaking change.

For large changes, open an issue first to discuss the approach. Changesets and publishing are handled separately by maintainers.

## Reporting Issues

Use [GitHub Issues](https://github.com/spraxium/rpc/issues) for bugs, feature requests and documentation gaps. Report security vulnerabilities privately through the [Security Policy](SECURITY.md).

Maintained by [Spacelaxy](https://github.com/spacelaxy).
