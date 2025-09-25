/// <reference types="vitest" />
import path from 'path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '~~': path.resolve(__dirname, '.'),
      '~': path.resolve(__dirname, '.'),
      '@': path.resolve(__dirname, 'server'),
    },
  },
  test: {
    globals: true,
    benchmark: {
      include: ['**/tests/**/*.bench.ts'],
    },
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
});
