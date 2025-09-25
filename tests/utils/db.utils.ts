import 'dotenv/config';

import { sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';

import config from '~~/drizzle.config';
import * as schema from '~~/server/database/schema';

const databaseURL = process.env.NUXT_TEST_DATABASE_URL || '';
const db = drizzle(databaseURL, { schema });

export const useTestDB = () => db;
export const tables = schema;

export const resetDB = async () => {
  // Drop all in the drizzle schema
  await db.execute(sql`DROP SCHEMA IF EXISTS drizzle CASCADE;`);
  // Drop all tables
  await db.execute(sql`DROP SCHEMA public CASCADE; CREATE SCHEMA public;`);

  // Run migrations
  await migrate(db, { migrationsFolder: config.out! });
};

export default db;
