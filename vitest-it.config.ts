import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['integration-tests/**/*.it.ts'],
    environment: 'node',
    globals: true,
    testTimeout: 1000 * 60 * 2,
  },
});
