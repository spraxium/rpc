# Resource ownership

Reuse one client for the backend process. HTTP/2 uses a session manager; HTTP/1.1 uses a keep-alive agent. `close()` releases the selected transport and aborts pending calls. The SDK does not create Discord caches, a framework container, a queue or retry workers.

Encoding checks arbitrary application objects for unsupported prototypes, getters, serializers and cycles before calling `JSON.stringify`. Decoding receives values from `JSON.parse`, so it only checks depth and numeric validity. Both paths enforce the same JSON byte limits and reuse UTF-8 encoders and decoders.

The gateway bounds request rate and concurrent calls. A canceled invocation keeps its slot until its handler settles, preventing ignored cancellation from exceeding the execution limit. Canceled work skips output validation and serialization after the handler returns.

Shard duplicate detection uses a set and a min-heap ordered by deadlines. It caps retained IDs at 10,000 and expires the earliest entries without scanning the entire history on each request. It does not persist results across process restarts.

Measure changes against the same payloads, runtime and concurrency before adjusting limits. Codec timing alone does not establish RPC throughput or Discord bot memory usage. The network, example and process suites check behavior under cancellation and shutdown; they do not claim production capacity.
