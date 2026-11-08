# @spraxium/rpc-protocol

Protobuf descriptors and the JSON codec shared by the bot adapter and client. The only runtime dependency is Protobuf ES. Discord.js and the Spraxium runtime are not installed by this package.

The package is not yet published. Run `pnpm pack:local` at the repository root to produce development archives. Both `import` and `require()` are supported on Node.js `>=22.23.2 <27`.

The source of truth is [gateway.proto](../../proto/spraxium/rpc/v1/gateway.proto):

```proto
package spraxium.rpc.v1;
service RpcGateway {
  rpc Invoke(InvokeRequest) returns (InvokeResponse);
}
message InvokeRequest {
  string method = 1;
  bytes payload_json = 2;
}
message InvokeResponse {
  bytes payload_json = 1;
}
```

`payload_json` holds UTF-8 JSON bytes, with the same [strict JSON rules](../spraxium/README.md#json-contract-and-errors) in both directions. Protobuf JSON encoding represents this bytes field as base64 (`payloadJson`), whereas Protobuf binary/gRPC transports transmit the bytes directly. Authentication uses `authorization: Bearer <token>` metadata. The standard Connect/gRPC status code carries failures; there is no custom error envelope or secret payload field. Deadlines/cancellation use the transport protocol.

The CI matrix covers supported Node majors 22, 24 and 26. Transport tests use ConnectRPC 2.2.0 and Protobuf ES 2.16.0. Official references: [Connect Node services](https://connectrpc.com/docs/node/getting-started/) and [Node clients](https://connectrpc.com/docs/node/using-clients/). The adapter uses Node's HTTP/2 listener directly.

Generate once when the stable transport contract changes, never per application handler:

```bash
pnpm proto:generate
pnpm proto:lint
```

The generator and Buf CLI are pinned dev dependencies. Generation removes comments with the TypeScript printer, then applies Biome. Generated TypeScript is committed; consumers use the compiled descriptors without a compiler. Preserve field numbers and wire compatibility within `spraxium.rpc.v1`; introduce a new package version namespace for incompatible transport changes. Applications version their own method names/contracts separately. Schemas are regenerated from `proto/`, so edit that source instead of the generated binding.

## Java gRPC clients

Generate Java message and gRPC service classes from the published `.proto` using your Java build's standard protoc/grpc-java plugins. The schema declares `java_package = "io.spraxium.rpc.v1"` and `java_multiple_files = true`. Compile it once; adding `guild.stats` or another custom handler does not change the service.

```java
import com.google.protobuf.ByteString;
import io.grpc.ManagedChannel;
import io.grpc.ManagedChannelBuilder;
import io.grpc.Metadata;
import io.grpc.stub.MetadataUtils;
import io.spraxium.rpc.v1.InvokeRequest;
import io.spraxium.rpc.v1.InvokeResponse;
import io.spraxium.rpc.v1.RpcGatewayGrpc;
import java.util.concurrent.TimeUnit;

ManagedChannel channel = ManagedChannelBuilder
    .forAddress("bot.example.com", 443).useTransportSecurity().build();
try {
  Metadata headers = new Metadata();
  headers.put(Metadata.Key.of("authorization", Metadata.ASCII_STRING_MARSHALLER),
      "Bearer " + System.getenv("SPRAXIUM_RPC_TOKEN"));
  var stub = RpcGatewayGrpc.newBlockingStub(channel)
      .withInterceptors(MetadataUtils.newAttachHeadersInterceptor(headers))
      .withDeadlineAfter(3, TimeUnit.SECONDS);
  InvokeResponse response = stub.invoke(InvokeRequest.newBuilder()
      .setMethod("guild.stats")
      .setPayloadJson(ByteString.copyFromUtf8("{\"guildId\":\"123456789012345678\"}"))
      .build());
  System.out.println(response.getPayloadJson().toStringUtf8());
} finally {
  channel.shutdownNow().awaitTermination(5, TimeUnit.SECONDS);
}
```

The same gateway is exercised over real gRPC in the Node integration suite. The Java snippet illustrates the same API; the repository also builds a Java reference client and tests it against the real Node server with `pnpm test:java`. See `examples/java-client`.
