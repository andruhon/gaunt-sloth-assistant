import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['spec/**/*.spec.ts'],
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
    },
    globals: true,
  },
});
