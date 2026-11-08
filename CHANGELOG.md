# Changelog

## 0.1.0 — unreleased

The bot adapter discovers RPC handlers through Spraxium's module lifecycle and uses existing DI providers. A single parent gateway routes guild calls to their owning shard. Authentication, permissions, deadlines, payload limits, concurrency limits and graceful shutdown apply to each call.

The Node client works with ESM and CommonJS on supported Node versions. Both entry points use the same implementation and error class. It creates only the resources needed by its selected transport and rejects already-canceled calls before serializing input.

Bot configuration accepts `token` and `permissions` for a single backend, with `auth.tokens` available for multiple credentials. Input and response schemas are optional and synchronous. Invalid schema results and unexpected handler errors are redacted. Security flags require booleans and tokens must fit in HTTP headers.

JSON decoding avoids descriptor and cycle checks on values already produced by `JSON.parse`, while preserving depth, numeric and byte limits. Shard manifests are requested concurrently during startup. Native process and network tests cover execution, cancellation and shutdown.

The repository includes NestJS, Hono, Fastify and Java examples, isolated package installation checks, a codec benchmark and integration/migration guides. The adapter remains unpublished until a compatible public framework release is verified and recorded.
