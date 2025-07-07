import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['integration-tests/**/*.it.ts'],
    environment: 'node',
    globals: true,
    testTimeout: 1000 * 60 * 5,
    maxWorkers: 1,
    fileParallelism: false,
    retry: 2,
  },
});
