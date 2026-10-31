import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { pnpmSync } from './package-manager.mjs';

class ExampleRunner {
  async run(app) {
    assert(['bot', 'nest', 'hono', 'fastify'].includes(app), 'Choose bot, nest, hono or fastify.');
    const manifest = new URL('../.local/example.json', import.meta.url);
    let prepared;
    try {
      prepared = JSON.parse(await readFile(manifest, 'utf8'));
    } catch {
      throw new Error('Prepare the example first: pnpm example:prepare --framework ../framework');
    }
    try {
      process.loadEnvFile(fileURLToPath(new URL('../.env', import.meta.url)));
    } catch (error) {
      if (!error || typeof error !== 'object' || !('code' in error) || error.code !== 'ENOENT') throw error;
    }
    pnpmSync(['run', app], { cwd: prepared.directory, stdio: 'inherit' });
  }
}

const { values } = parseArgs({ options: { app: { type: 'string' } } });
await new ExampleRunner().run(values.app);
