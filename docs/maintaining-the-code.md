# Code structure

The packages are organized by responsibility. Keep constructor dependencies explicit and one production class per file. The [Portuguese maintenance guide](maintenance.pt-BR.md) follows a call through the implementation.

| Area | Owner |
| --- | --- |
| Client options | `RpcClientConfigResolver` |
| Calls and client shutdown | `NodeRpcClient` |
| HTTP agents and HTTP/2 sessions | `ConnectRpcConnection` |
| JSON validation and UTF-8 bytes | `JsonCodec` |
| Handler discovery | `RpcHandlerMetadataStore`, `RpcRegistry`, `RpcBoundHandler` |
| Admission and active executions | `RpcExecutor` |
| One handler invocation | `RpcInvocation` |
| Input and response schemas | `RpcSchemaValidator` |
| Credentials and request quotas | `RpcTokenAuthenticator`, `RpcCredentialRateLimiter` |
| Network listener | `RpcServer` |
| Shard selection and dispatch | `RpcShardDispatcher` |
| One pending IPC call | `RpcPendingRequest` |
| Duplicate IPC IDs | `RpcRequestHistory` |
| Worker execution | `RpcShardWorker` |
| Module registration and lifecycle | `RpcModule`, `RpcLifecycle`, `RpcModuleLifecycle` |
| Framework and parent gateway | `RpcParentGateway`, `SpraxiumRpcHost` |

Public functions such as `createRpcClient` and `RpcHandler` are small entry points. Runtime composition connects the classes; it does not add another container. The adapter discovers providers already created by native DI, starts admission after provider readiness and drains work before teardown.

`RpcInvocation` owns its timer and cancellation listeners. A canceled handler retains its concurrency slot until it settles. `RpcPendingRequest` owns the response wait for one IPC request. Keep those resource lifetimes separate from routing and business logic.

The examples run directly as JavaScript. Their entry points construct dependencies, and application classes own routes, error mapping and shutdown. The example tests start separate HTTP processes and use a real local gateway. Package tests install archives in a system temporary directory and remove it in `finally`.

Use `pnpm check` for package changes, `pnpm test:examples` for integrations and `pnpm test:interop` for gRPC changes. Framework hooks require the additional checks described in [compatibility](framework-compatibility.md).
