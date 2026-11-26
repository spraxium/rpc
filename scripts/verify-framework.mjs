import { readFileSync } from 'node:fs';

const compatibility = JSON.parse(
  readFileSync(new URL('../compatibility/framework.json', import.meta.url), 'utf8'),
);
const adapter = JSON.parse(
  readFileSync(new URL('../packages/spraxium/package.json', import.meta.url), 'utf8'),
);
const frameworkPackages = ['@spraxium/common', '@spraxium/core', '@spraxium/logger'];

if (!/^[a-f0-9]{40}$/.test(compatibility.ref ?? '') || typeof compatibility.version !== 'string') {
  throw new Error('Record the tested framework commit and version before publishing the RPC adapter.');
}
for (const name of frameworkPackages) {
  if (
    adapter.peerDependencies[name] !== `^${compatibility.version}` ||
    compatibility.peers?.[name] !== adapter.peerDependencies[name]
  ) {
    throw new Error(`The compatibility record and adapter peer do not match for ${name}.`);
  }
}
