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
    environment: 'node',
    include: ['tests/**/*.test.ts', 'tests/**/*.spec.ts'],
    // benchmark: {
    //   include: ['tests/**/*.bench.ts'],
    // },
    // typecheck: {
    //   tsconfig: 'tsconfig.json',
    //   include: ['tests/**/*.ts'],
    // },
  },
});
