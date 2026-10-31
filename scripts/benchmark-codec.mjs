import { performance } from 'node:perf_hooks';
import { decodeJson, encodeJson } from '../packages/protocol/dist/index.js';

class JsonCodecBenchmark {
  run() {
    const messages = [];
    for (let id = 0; id < 500; id++) {
      messages.push({
        id: String(id),
        content: 'hello'.repeat(20),
        author: { id: '123456789012345678', bot: false },
      });
    }
    const bytes = encodeJson({ messages }, 1048576);
    for (let iteration = 0; iteration < 200; iteration++) decodeJson(bytes, 1048576);
    const trials = [];
    for (let trial = 0; trial < 5; trial++) {
      const started = performance.now();
      for (let iteration = 0; iteration < 1000; iteration++) decodeJson(bytes, 1048576);
      trials.push(Number((performance.now() - started).toFixed(2)));
    }
    console.log(
      JSON.stringify(
        { node: process.version, payloadBytes: bytes.length, iterations: 1000, decodeMilliseconds: trials },
        null,
        2,
      ),
    );
  }
}

new JsonCodecBenchmark().run();
