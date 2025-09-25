import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'postgresql',
  out: './server/database/migrations',
  schema: './server/database/schema',
  dbCredentials: { url: process.env.NUXT_DATABASE_URL! },
});
