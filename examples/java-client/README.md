# Java gRPC reference client

Requires JDK 17+ and Maven 3.9+. The Maven build generates messages and service bindings from the repository's canonical `proto/` directory. There is no copied schema and no generator step per application handler.

```bash
mvn -B -f examples/java-client/pom.xml package
```

Set `SPRAXIUM_RPC_TOKEN` in your environment, then call a registered handler through TLS:

```bash
java -jar examples/java-client/target/rpc-java-client.jar bot.example.com 443 guild.stats '{"guildId":"123456789012345678"}'
```

The optional last argument `--insecure-local` permits cleartext only with `127.0.0.1`, for the automated interoperability test. Production defaults to TLS. Calls include bearer metadata and a three-second deadline; the channel closes in `finally`. Standard gRPC status codes are printed on failure without response payloads or credentials.

Run `pnpm test:java` from the repository root to build this application and test successful calls and authentication errors against the real Node RPC server. This is a reference application, not a published Java SDK.

The local interoperability tests use the Node server without logging into Discord. To call a real bot, first run it with a compatible framework build and a registered handler as described in the [integration tutorial](../../docs/getting-started.md). Application inputs and responses remain JSON inside the Protobuf bytes field; Java consumers must validate their application DTOs independently.
