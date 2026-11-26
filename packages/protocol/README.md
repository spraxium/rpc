# @spraxium/rpc-protocol

The shared RPC v1 wire contract for `@spraxium/rpc` and `@spraxium/rpc-client`. It ships the generated Protobuf messages and service descriptor, the JSON codec and the TypeScript types used to describe RPC methods.

Most apps get this package through the adapter or client. Install it directly if you are working on another transport integration or need the shared codec.

```sh
pnpm add @spraxium/rpc-protocol
```

```ts
import { DEFAULT_MAX_PAYLOAD_BYTES, decodeJson, encodeJson } from '@spraxium/rpc-protocol';

const bytes = encodeJson({ ready: true }, DEFAULT_MAX_PAYLOAD_BYTES);
const payload = decodeJson(bytes, DEFAULT_MAX_PAYLOAD_BYTES);
```

The wire schema lives at `proto/spraxium/rpc/v1/gateway.proto` in the [RPC repository](https://github.com/spraxium/rpc). Published v1 clients and gateways use that same schema.

[RPC documentation](https://spraxium.com/en/guide/rpc-overview)
