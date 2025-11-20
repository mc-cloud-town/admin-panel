/// <reference types="vitest" />
import path from 'path';
import process from 'process';
import { loadEnv } from 'vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '~': path.resolve(__dirname, '.'),
      '~~': path.resolve(__dirname, '.'),
      '@': path.resolve(__dirname, 'server'),
    },
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts', 'tests/**/*.spec.ts'],
    env: loadEnv('', process.cwd(), ''),
  },
});
