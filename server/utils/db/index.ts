import type { SQL } from 'drizzle-orm';
import { getTableColumns, sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import type { PgTable } from 'drizzle-orm/pg-core';

import * as schema from '~~/server/database/schema';

const databaseURL = process.env.NUXT_DATABASE_URL || '';
const db = drizzle(databaseURL, {
  schema,
  cache: new RedisCache(process.env.NUXT_REDIS_URL),
});

export const buildConflictUpdateColumns = <
  T extends PgTable,
  Q extends keyof T['_']['columns']
>(
  table: T,
  columns: Q[]
) => {
  const cls = getTableColumns(table);
  return columns.reduce((acc, column) => {
    const colName = cls[column].name;
    acc[column] = sql.raw(`excluded.${colName}`);
    return acc;
  }, {} as Record<Q, SQL>);
};

export const useDrizzle = () => db;
export const tables = schema;

export default db;
