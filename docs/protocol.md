# Protocol and language support

`proto/spraxium/rpc/v1/gateway.proto` is the sole maintained wire contract. The stable unary method is `/spraxium.rpc.v1.RpcGateway/Invoke`. Request field 1 is the application method name; field 2 is UTF-8 JSON bytes. Response field 1 is UTF-8 JSON bytes. ProtoJSON represents bytes as base64 in `payloadJson`.

Authentication is `authorization: Bearer <service token>` metadata. Deadlines and cancellation use Connect/gRPC semantics, and failures use standard status codes. Application handlers expose plain DTOs, not Discord instances. JSON accepts null, booleans, finite numbers, strings, dense arrays and plain objects. It rejects bigint, undefined, cycles, sparse arrays, class instances, accessors and implicit `toJSON` conversions. Send snowflakes and large integral identifiers as decimal strings to avoid cross-language numeric precision loss. JSON nesting is bounded at 64 levels and payload bytes are bounded in both directions.

## Evolution

1. Edit the canonical schema only when the transport changes; custom handler additions do not alter it.
2. Preserve field numbers/types and reserve removed field numbers/names. An incompatible wire change requires `spraxium.rpc.v2` alongside v1.
3. Run `pnpm proto:generate`, `pnpm proto:lint`, `pnpm proto:breaking`, `pnpm proto:check` and `pnpm test:interop`.
4. Commit regenerated TypeScript. Package builds stage the canonical `.proto` into the protocol archive automatically.

`compatibility/v1.binpb` captures the accepted v1 contract at extraction. Normal changes must remain compatible with this baseline and, in pull requests, the target branch. Updating the baseline is an explicit protocol governance decision, never a routine fix for failing checks.

Transport namespace, npm SemVer and application method versions are separate. A client package release does not require a wire namespace change; a breaking application payload should use an application-owned versioned method/contract.

## Language matrix

| Consumer | Current status |
| --- | --- |
| Node.js / TypeScript | Maintained typed SDK and package-install checks |
| Other gRPC languages | Schema available; no SDK or tested-support claim yet |
| Browser | No public SDK; service tokens must remain in the backend |

An additional SDK must demonstrate credential metadata, deadlines, cancellation, JSON/UTF-8 rules, standard errors, bounded payloads, resource cleanup and interoperability with the Node gateway. Each SDK keeps its language's native build and release tools; no TypeScript source is a cross-language dependency.
