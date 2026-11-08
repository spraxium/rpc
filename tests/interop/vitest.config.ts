import { defineConfig } from 'vitest/config';

export default defineConfig({ test: { include: ['tests/interop/gateway.test.ts'], testTimeout: 15000 } });
