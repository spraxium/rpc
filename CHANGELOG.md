# Changelog

## 0.1.0 — unreleased

Update Zod, Hono and its Node adapter, Vitest, and vulnerable backend dependencies. Add regression tests for constrained collection validation, CSRF checks and mounted route protection.

The bot adapter registers handlers through Spraxium's module lifecycle and uses existing DI providers. A parent gateway routes guild calls to their owning shard. Calls enforce credentials, handler permissions, deadlines, payload limits and concurrency limits, and drain during shutdown.

The Node client supports ESM and CommonJS with the same implementation and error class. It creates resources for the selected Connect or gRPC transport and closes them explicitly. The shared protocol validates JSON values and preserves the v1 Protobuf contract.

Examples run directly as JavaScript in separate projects for Hono, NestJS, Fastify, Express, Koa, native Node HTTP and ESM/CommonJS console clients. Tests cover their responses, native provider injection, gRPC and isolated package installation.

The packages remain unpublished. The adapter requires framework hooks that are not available in the recorded public release.
