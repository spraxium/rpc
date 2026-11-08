# Performance and resource ownership

The client creates resources only for its selected transport. HTTP/2 uses a session manager; HTTP/1.1 uses a keep-alive agent. Reuse the client for the backend process lifetime and close it during application shutdown. The SDK does not add a queue, retry worker, Discord cache or framework container.

Encoding and decoding use different validation paths. Encoding checks arbitrary JavaScript objects for custom prototypes, getters, serializers and cycles before calling `JSON.stringify`. Decoding receives a fresh tree from `JSON.parse`, so it checks numeric validity and depth without allocating a cycle-detection set or inspecting property descriptors. Both paths retain the same JSON byte and nesting limits.

## Local codec measurement

On Windows with Node 26.12.1, a synthetic 87,404-byte payload containing 500 message-like objects was decoded 1,000 times per trial after 200 warm-up iterations. Five trials before the change took 560.39, 580.50, 581.05, 534.74 and 533.14 ms. Five trials after the change took 229.87, 229.55, 227.01, 233.28 and 223.93 ms. The median went from 560.39 to 229.55 ms, about 59% less time for this decoding workload.

This is a codec microbenchmark. It does not measure Discord traffic, RPC throughput, network latency or process memory. Results vary by runtime, payload and machine. Run the same workload locally with:

```bash
pnpm benchmark:codec
```

## Limits under load

The server bounds payload bytes, credential request rate and concurrent executions. Deadlines and cancellation return promptly, while a handler that ignores cancellation keeps its execution slot until it settles. Releasing that slot early would admit more actual work than configured. After cancellation, completed handlers skip response validation and serialization.

The shard request history caps retained IDs at 10,000 and expires them using a min-heap rather than scanning the entire history for every request. It prevents duplicate execution of the same IPC request during its original deadline. It does not retain application results across restarts.

RPC uses Connect and Protobuf ES for framing and language interoperability, with Node's HTTP/2, crypto, buffers and process IPC underneath. Removing those protocol dependencies would mean maintaining a transport implementation here. Application validation libraries and web frameworks stay outside the production packages.
