import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    testTimeout: 50000,
    include: ['test/*.test.ts', 'src/**/*.test.ts'],
    exclude: ['node_modules', 'dist', '.idea', '.git', '.cache'],
    globals: true,
    mockReset: true,
    clearMocks: true,
    environment: 'node'
  }
});
