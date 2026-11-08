import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),
  test: { include: ['*.test.ts'], testTimeout: 30000, hookTimeout: 120000, maxWorkers: 1 },
});
