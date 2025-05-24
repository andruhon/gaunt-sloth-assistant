import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['integration-tests/**/*.it.ts'],
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
    },
    globals: true,
    testTimeout: 100000,
  },
});
