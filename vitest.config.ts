import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/__specs__/**/*.spec.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/**/__specs__/**', 'src/shared/tests/**'],
      reporter: ['text-summary', 'lcov'],
    },
  },
});
