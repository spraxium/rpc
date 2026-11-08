# Architecture decisions

Dependencies are pinned in the lockfile. The decisions below describe the repository's package boundaries, transport and build tools.

## 001 — Protobuf + ConnectRPC

Keep the existing v1 Protobuf gateway and Connect 2.2.0. Connect's Node adapter supports Connect and gRPC with standard status codes, deadlines and cancellation. The same gateway can be called by a generated Java gRPC client. An application handler does not require another generated service.

Alternatives considered: tRPC couples consumers to TypeScript; a bespoke WebSocket protocol would require our own framing, error and interoperability rules; gRPC alone would lose Connect's HTTP tooling without improving the bot dispatch model. A queue would change unary request/response and delivery semantics.

Sources: [Connect Node](https://connectrpc.com/docs/node/getting-started/), [Connect protocol](https://connectrpc.com/docs/protocol/), [gRPC Java](https://github.com/grpc/grpc-java).

## 002 — pnpm workspaces and catalogs

Use pnpm 12.14.0, a single lockfile, explicit `workspace:*` package edges and catalogs for shared third-party versions. pnpm rewrites workspace/catalog references when packing; installation tests verify the resulting artifacts outside the workspace. Install scripts require an explicit tool allowlist.

For three publishing units, pnpm's topological recursive execution is sufficient. Turborepo's task graph and output cache become useful when build cost grows. Nx/Bazel introduce more project/task configuration than this repository currently needs. Do not add a second orchestrator until measured build cost justifies it; native language builds retain their own tools (Maven for Java).

Sources: [pnpm workspaces](https://pnpm.io/workspaces), [catalogs](https://pnpm.io/catalogs), [settings](https://pnpm.io/settings), [Turborepo tasks](https://turborepo.dev/docs/crafting-your-repository/configuring-tasks).

## 003 — Buf owns contract checks

The root `proto/` is canonical for all languages. Buf 1.74.0 lints and formats it, generates the TypeScript binding with pinned local Protobuf ES 2.16.0, and checks FILE compatibility against a committed v1 descriptor. CI also compares pull requests with their target branch. Generation drift fails independently of build success.

The existing v1 service/message names are preserved with narrow lint exceptions. Local generation avoids requiring a hosted schema registry account. A registry can be introduced for SDK distribution once repository hosting, ownership and publishing are configured.

Sources: [Buf generation](https://buf.build/docs/generate/), [breaking checks](https://buf.build/docs/breaking/), [v2 workspace configuration](https://buf.build/docs/configuration/v2/buf-yaml/).

## 004 — Three packages and a framework compatibility boundary

Preserve the protocol, standalone Node client and bot adapter. The adapter uses native DI/lifecycle/IPC hooks. Its transport/executor remain separate source modules; they do not become an extra public server SDK without an actual second runtime consumer. New language SDKs consume `proto/`, not TypeScript internals.

The framework's currently published 0.3.2 lacks the required hooks. Main tests exercise protocol/security/transport independently; a separate compatibility test installs real local framework and RPC archives. No sibling checkout, machine path or local tarball is encoded in the normal dependency graph or committed lockfile. Publishing the adapter requires a verified framework release and final peer ranges. The prepublish gate enforces the compatibility record; CI consumes the recorded immutable framework commit.

## 005 — Build and verification tools

Use TypeScript 5.9.3, tsdown 0.23.1 for ESM/declarations, Biome 1.9.4 and Vitest 4.1.11. Client and protocol expose the same synchronous ESM graph through import and require conditions on the supported modern Node versions. This avoids separate builds with different error-class identities. Node 24 is the development default; supported majors 22/24/26 are configured in CI. RPC packages use `>=22.23.2 <27`; the compatible framework may require newer patch versions.

Sources: [tsdown dependency handling](https://tsdown.dev/options/dependencies), [Node release policy](https://nodejs.org/en/about/previous-releases).
