# Maintaining the RPC implementation

Handwritten TypeScript is organized by responsibility. Keep one class per production file, one contract per interface/type file, and import internal contracts directly. Arrays use `Array<T>` and `ReadonlyArray<T>`; prefer `unknown` for untrusted values. Biome follows the framework's formatting and lint rules.

The [Portuguese maintenance guide](maintenance.pt-BR.md) follows a request through the code and lists the checks needed for common changes.

| Area | Behavior owner | Resource or contract boundary |
| --- | --- | --- |
| Node SDK configuration | `RpcClientConfigResolver` | Client options |
| Node calls and shutdown | `NodeRpcClient` | `RpcGatewayConnection` |
| Connect/gRPC resources | `ConnectRpcConnection` | HTTP agents and HTTP/2 sessions |
| JSON representation | `JsonCodec` | JSON values and UTF-8 bytes |
| Handler metadata/discovery | `RpcHandlerMetadataStore`, `RpcRegistry`, `RpcBoundHandler` | Existing provider instances |
| Admission and active calls | `RpcExecutor` | `RpcDispatcher` |
| One handler invocation | `RpcInvocation` | Schema, handler, deadline and cancellation |
| Synchronous schema checks | `RpcSchemaValidator` | Input/response validation and error redaction |
| Authentication and quotas | `RpcTokenAuthenticator`, `RpcCredentialRateLimiter` | `RpcAuthenticator`, `RpcRateLimiter` |
| Network gateway | `RpcServer` | Dispatcher, authenticator, limiter and logger |
| Shard routing | `RpcShardDispatcher` | `RpcShard`, validated IPC messages |
| One IPC request | `RpcPendingRequest` | Correlation, timeout, cancellation and completion |
| Shard replay history | `RpcRequestHistory` | Bounded IDs ordered by expiration |
| Worker execution | `RpcShardWorker` | `RpcIpcPeer`, `RpcDispatcher` |
| Module registration and lifecycle | `RpcModule`, `RpcLifecycle`, `RpcModuleLifecycle` | Native global module and DI providers |
| Framework and parent gateway | `RpcParentGateway`, `SpraxiumRpcHost` | `RpcFrameworkHost` |

Public functions such as `createRpcClient`, `RpcHandler`, `encodeJson` and `decodeJson` remain small entry points that delegate behavior to classes. The factory preserves detached `call`/`close` methods. `RpcModule` registers the adapter's providers through native DI, like the framework's schedule and signal modules. `RpcRuntimeComposition` and the client entry point assemble transport dependencies.

Consumers import `RpcModule` and configure `defineRpc` through the normal plugins array. The internal `RpcModuleLifecycle` bridge buffers discovery until the DI registry exists, starts ingress after every provider's ready hook, and drains it before provider shutdown. It resolves the existing DI lifecycle rather than constructing a second runtime. Shutdown is idempotent because both the infrastructure phase and the provider lifecycle participate in teardown.

The executor retains a concurrency slot until an invocation settles, even if its deadline already expired. `RpcInvocation` owns its timer and signal listeners; releasing an invocation removes those resources. `RpcPendingRequest` similarly owns the completion and cleanup of one shard request. Keep these lifetimes separate from handler rules and routing decisions.

`RpcCancellation.waitForSettled` owns the timeout used to drain work. The dispatcher waits on request completion promises instead of polling its pending map. `RpcRequestHistory` keeps a set of IDs and a binary min-heap of deadlines: duplicate checks are constant time, insertion/removal is logarithmic, and expiration inspects only the earliest deadlines. The worker retains its 10,000-ID limit.

The JSON codec reuses its UTF-8 encoder/decoder. Encoding checks property descriptors, prototypes and serializers before `JSON.stringify` can execute them. Decoding works on the result of `JSON.parse`, so it only checks nesting and numeric validity; parsed JSON cannot contain getters, cycles or custom prototypes. Keep those two trust boundaries separate when optimizing. The transport closes its sessions in `finally`, so a dispatcher shutdown failure cannot leave the listener open.

The NestJS example separates module composition, service and controller, and injects its RPC client. The Hono and Fastify entry points assemble dashboard applications whose route/error/shutdown callbacks delegate to named methods. Fastify releases the injected RPC client in its `onClose` hook after HTTP requests drain. Tooling checks use dedicated runner classes and preserve the package-manager functions consumed by the sibling local example.

Keep implementation explanations and API usage in documentation. Source files contain no comments. Generated bindings pass through `scripts/format-generated.mjs`, which strips generator comments before Biome formatting; the pinned generator version remains recorded in the catalog and lockfile. Update the canonical schema and use `pnpm proto:generate` instead of editing bindings manually.

Run `pnpm check` after refactoring. Changes to integration, discovery or shard behavior also require `pnpm test:framework --framework PATH`; wire/transport changes require `pnpm test:java`.
