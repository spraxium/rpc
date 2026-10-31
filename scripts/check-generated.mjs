import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { pnpmSync } from './package-manager.mjs';

class GeneratedProtocolCheck {
  async run() {
    const cli = process.env.npm_execpath;
    assert(cli, 'Run with pnpm proto:check.');
    const source = new URL('../packages/protocol/src/gen/spraxium/rpc/v1/gateway_pb.ts', import.meta.url);
    const before = await readFile(source, 'utf8');
    pnpmSync(['proto:generate'], { stdio: 'inherit' });
    assert.equal(
      await readFile(source, 'utf8'),
      before,
      'Generated protocol is stale. Run pnpm proto:generate.',
    );
  }
}

await new GeneratedProtocolCheck().run();
