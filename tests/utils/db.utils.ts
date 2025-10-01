import 'dotenv/config';

import crypto from 'crypto';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import type { Pool } from 'pg';
import { Client as PgClient } from 'pg';

import config from '~~/drizzle.config';
import * as schema from '~~/server/database/schema';
import { RedisCache } from '~~/server/utils/db/cache';

import type { DBSeedOptions } from './db-setup.utils';
import { seedSetupDB } from './db-setup.utils';

const DATABASE_URL = process.env.NUXT_TEST_DATABASE_URL || '';

export type TestDB = ReturnType<typeof drizzle<typeof schema, Pool>> & {
  databaseName: string;
  redisCache: RedisCache;
};
export type TestDBCtx<Opt extends DBSeedOptions | undefined = undefined> =
  Awaited<ReturnType<typeof seedSetupDB<Opt>>> & { db: TestDB };

const rootDBRun = async (query: string) => {
  const rootDB = new PgClient({ connectionString: DATABASE_URL });
  await rootDB.connect();
  await rootDB.query(query);
  await rootDB.end();
};

export const createTestDatabase = async (): Promise<TestDB> => {
  const dbName = `test_db_${Date.now()}_${crypto
    .randomUUID()
    .replace(/-/g, '_')}`;

  await rootDBRun(`CREATE DATABASE ${dbName};`);

  const testDBUrl = DATABASE_URL.replace(/\/[^/]+$/, `/${dbName}`);
  const redisCache = new RedisCache(
    process.env.NUXT_TEST_REDIS_URL,
    { namespace: `drizzle-orm-test-${dbName}` },
    true
  );
  redisCache.connect();
  const db = drizzle(testDBUrl, { schema, cache: redisCache });

  await migrate(db, { migrationsFolder: config.out! });

  return Object.assign(db, { redisCache, databaseName: dbName });
};

export const dropTestDatabase = async (db: TestDB) => {
  if (!db.$client.ended) await db.$client.end();

  await rootDBRun(`DROP DATABASE IF EXISTS ${db.databaseName} WITH (FORCE);`);
};

export const withTestDB = async <Opt extends DBSeedOptions | undefined>(
  seedOptions?: Opt
) => {
  const db = await createTestDatabase();
  const seedData = await seedSetupDB<Opt>(db, seedOptions);

  return {
    db,
    ctx: { db, ...seedData },
    close: async () => {
      await dropTestDatabase(db);
      await db.redisCache.disconnect();
    },
  };
};
