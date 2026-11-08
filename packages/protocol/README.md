# @spraxium/rpc-protocol

Protobuf descriptors and the JSON codec shared by the adapter and Node client. Its only runtime dependency is Protobuf ES. The package is not published yet; build it with `pnpm --filter @spraxium/rpc-protocol build` and create a local archive with `pnpm pack` in this directory.

The canonical wire contract is [gateway.proto](../../proto/spraxium/rpc/v1/gateway.proto). The unary service `/spraxium.rpc.v1.RpcGateway/Invoke` carries an application method name and UTF-8 JSON bytes. A response contains JSON bytes. Protobuf binary transmits the bytes directly; ProtoJSON represents them as base64 in `payloadJson`.

Authentication uses `authorization: Bearer <token>` metadata. Failures use standard Connect/gRPC status codes. Deadlines and cancellation follow the transport protocol. The [JSON contract](../spraxium/README.md#json-contract) applies in both directions, including byte limits and decimal-string identifiers.

## Generation

Edit the canonical schema when the transport changes, then run:

```bash
pnpm proto:generate
pnpm proto:lint
pnpm proto:breaking
pnpm proto:check
```

Buf and Protobuf ES are pinned development dependencies. Generation strips comments through the TypeScript printer and applies Biome. Commit the regenerated binding. Package consumers use the compiled descriptors without installing a generator.

Preserve field numbers and wire compatibility within `spraxium.rpc.v1`. An incompatible transport needs a new namespace. Adding an application handler does not change this service or require regeneration. The package archive includes the canonical schema so other gRPC tooling can consume it, but this repository maintains only the Node SDK.

The [protocol guide](../../docs/protocol.md) explains the accepted JSON values and compatibility baseline. `pnpm test:interop` verifies Node calls over real gRPC.
