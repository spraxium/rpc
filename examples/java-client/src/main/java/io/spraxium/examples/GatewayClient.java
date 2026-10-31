package io.spraxium.examples;

import com.google.protobuf.ByteString;
import io.grpc.ManagedChannel;
import io.grpc.ManagedChannelBuilder;
import io.grpc.Metadata;
import io.grpc.StatusRuntimeException;
import io.grpc.stub.MetadataUtils;
import io.spraxium.rpc.v1.InvokeRequest;
import io.spraxium.rpc.v1.RpcGatewayGrpc;
import java.util.concurrent.TimeUnit;

public final class GatewayClient {
    public static void main(String[] args) throws InterruptedException {
        if (args.length < 4 || args.length > 5) {
            throw new IllegalArgumentException("Usage: HOST PORT METHOD JSON [--insecure-local]");
        }

        String token = System.getenv("SPRAXIUM_RPC_TOKEN");
        if (token == null || token.isBlank()) {
            throw new IllegalArgumentException("SPRAXIUM_RPC_TOKEN is required.");
        }

        var builder = ManagedChannelBuilder.forAddress(args[0], Integer.parseInt(args[1]));
        if (args.length == 5) {
            if (!args[4].equals("--insecure-local") || !args[0].equals("127.0.0.1")) {
                throw new IllegalArgumentException("Plaintext is restricted to explicit IPv4 loopback tests.");
            }
            builder.usePlaintext();
        } else {
            builder.useTransportSecurity();
        }

        ManagedChannel channel = builder.build();
        int exitCode = 0;
        try {
            Metadata headers = new Metadata();
            headers.put(Metadata.Key.of("authorization", Metadata.ASCII_STRING_MARSHALLER), "Bearer " + token);
            var stub = RpcGatewayGrpc.newBlockingStub(channel)
                .withInterceptors(MetadataUtils.newAttachHeadersInterceptor(headers))
                .withDeadlineAfter(3, TimeUnit.SECONDS);
            var response = stub.invoke(InvokeRequest.newBuilder()
                .setMethod(args[2])
                .setPayloadJson(ByteString.copyFromUtf8(args[3]))
                .build());
            System.out.println(response.getPayloadJson().toStringUtf8());
        } catch (StatusRuntimeException error) {
            System.err.println(error.getStatus().getCode().name());
            exitCode = 1;
        } finally {
            channel.shutdownNow().awaitTermination(5, TimeUnit.SECONDS);
        }

        if (exitCode != 0) System.exit(exitCode);
    }
}
