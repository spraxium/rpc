import { defineConfig } from 'vitest/config';
export default defineConfig({ test: { include: ['tests/interop/java.test.ts'], testTimeout: 15000 } });
