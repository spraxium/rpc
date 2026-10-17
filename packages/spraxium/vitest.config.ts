import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['test/**/*.test.ts'],
    exclude: process.env.RPC_FRAMEWORK_FIXTURE ? [] : ['test/process.test.ts'],
    passWithNoTests: true,
  },
});
