import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Next's tsconfig sets jsx: preserve; tests that import .tsx modules need it compiled.
  oxc: { jsx: { runtime: 'automatic' } },
  test: {
    environment: 'node',
    include: ['app/**/*.test.ts', 'lib/**/*.test.ts', 'components/**/*.test.ts'],
  },
});
