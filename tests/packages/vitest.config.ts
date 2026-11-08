import { defineConfig } from 'vitest/config';

export default defineConfig({ test: { include: ['tests/packages/*.test.ts'], testTimeout: 120000 } });
