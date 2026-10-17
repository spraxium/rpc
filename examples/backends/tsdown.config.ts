import { defineConfig } from 'tsdown';
export default defineConfig({
  entry: ['bot/main.ts', 'hono/main.ts', 'nest/main.ts', 'fastify/main.ts', 'spraxium.config.ts'],
  outDir: 'dist',
  format: 'esm',
  fixedExtension: false,
  platform: 'node',
  dts: false,
  clean: true,
  hash: false,
});
