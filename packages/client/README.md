# @spraxium/rpc-client

Call a Spraxium bot or a standalone `@spraxium/rpc-server` gateway from Node.js, including from another bot provider. The client uses Connect by default and also supports gRPC over HTTP/2. It works with ESM and CommonJS.

```sh
pnpm add @spraxium/rpc-client
```

Start a bot with `@spraxium/rpc` first. Use the service token that the bot has configured for your backend.

```ts
import { createRpcClient } from '@spraxium/rpc-client';

type BotRpc = {
  'bot.health': { input: null; output: { ready: boolean } };
};

const rpc = createRpcClient<BotRpc>({
  url: 'http://127.0.0.1:4300',
  token: process.env.SPRAXIUM_RPC_TOKEN ?? '',
});

try {
  const status = await rpc.call('bot.health', null, { timeoutMs: 3_000 });
  console.log(status.ready);
} finally {
  rpc.close();
}
```

In a web server, create one client at startup, reuse it in routes, and close it when the process shuts down. A call can take an `AbortSignal` as `signal`. Catch `RpcClientError` and use its `code` to decide how the backend should respond.

[Backend examples](https://spraxium.com/en/guide/rpc-backends) · [NestJS](https://spraxium.com/en/guide/rpc-nestjs) · [First call](https://spraxium.com/en/guide/rpc-quickstart)
