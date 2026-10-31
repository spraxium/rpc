import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

class FrameworkReleaseCheck {
  async run() {
    const compatibility = JSON.parse(
      await readFile(new URL('../compatibility/framework.json', import.meta.url), 'utf8'),
    );
    assert(
      typeof compatibility.ref === 'string' && /^[a-f0-9]{40}$/.test(compatibility.ref),
      'Adapter publication is blocked. Release the framework hooks and record its verified commit in compatibility/framework.json.',
    );
    assert(
      compatibility.peers && typeof compatibility.peers === 'object',
      'Record the verified framework peer versions.',
    );
    const manifest = JSON.parse(
      await readFile(new URL('../packages/spraxium/package.json', import.meta.url), 'utf8'),
    );
    for (const name of ['@spraxium/common', '@spraxium/core', '@spraxium/logger']) {
      assert.equal(
        manifest.peerDependencies[name],
        compatibility.peers[name],
        `Set ${name} to the verified peer range.`,
      );
      assert(
        typeof compatibility.peers[name] === 'string' && compatibility.peers[name].length > 0,
        `Missing peer ${name}.`,
      );
    }
    console.log(`Adapter peers match the framework compatibility record at ${compatibility.ref}.`);
  }
}

await new FrameworkReleaseCheck().run();
