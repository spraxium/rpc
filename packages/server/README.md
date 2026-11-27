# Spraxium RPC Server

Receive Spraxium RPC calls in a Node.js app. A Discord bot can ask your backend to create a ticket, read settings or run another operation it owns. The same client works with this server and the gateway inside a Spraxium bot.

```sh
pnpm add @spraxium/rpc-server
```

```ts
import { createRpcServer } from '@spraxium/rpc-server';

type BackendRpc = {
  'backend.status': { input: null; output: { ready: boolean } };
};

const server = createRpcServer<BackendRpc>({
  host: '127.0.0.1',
  port: 4400,
  token: process.env.BACKEND_RPC_TOKEN ?? '',
  permissions: ['status:read'],
});

server.register('backend.status', {
  permissions: ['status:read'],
  schema: {
    parse(input) {
      if (input !== null) throw new Error('Expected null.');
      return input;
    },
  },
  handle: () => ({ ready: true }),
});

await server.start();
```

From the calling process, point `createRpcClient<BackendRpc>()` at `http://127.0.0.1:4400` with the same service token, then call `rpc.call('backend.status', null)`. A token must contain at least 32 printable ASCII characters. Keep it in the environment of the two services.

Register every method before `start()`. A method requires an input schema and either permissions or explicit `allowAuthenticated: true`. The handler receives the parsed data and an optional second argument with the caller identity, request ID, deadline and cancellation signal. Supply a `responseSchema` when you also want to validate the result. Throw `RpcError` for failures whose message is safe to return to the caller.

The server has its own listener. Start and close it with NestJS, Express, Fastify, Hono on Node.js, or a plain Node process. With NestJS, use `onApplicationBootstrap()` and `onApplicationShutdown()`, and enable shutdown hooks at startup. Outside loopback, use TLS or configure an explicit TLS-terminating proxy that can forward HTTP/2 to the gateway. Keep the listener on a network callers can reach.

[Two-way NestJS walkthrough](https://spraxium.com/en/guide/rpc-nestjs-two-way) · [NestJS example source](https://github.com/spraxium/rpc/tree/main/examples/nestjs)
