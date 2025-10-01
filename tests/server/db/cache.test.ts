import { eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import { membersTable } from '~~/server/database/schema';
import { type TestDBCtx, withTestDB } from '~~/tests/utils/db.utils';
import type { DBSeedOptions } from '~~/tests/utils/db-setup.utils';

const seedWith = {} satisfies DBSeedOptions;

let dbCtx: TestDBCtx<typeof seedWith>;
beforeAll(async () => {
  const { ctx, close } = await withTestDB(seedWith);
  dbCtx = ctx;
  return close;
});

describe('redisCacheTest', () => {
  it('should cache member data', async () => {
    const { db } = dbCtx;
    const member100 = await db
      .select({ id: membersTable.id })
      .from(membersTable)
      .where(eq(membersTable.id, 'member100'))
      .$withCache({ tag: 'member:member100', config: { ex: 60 } })
      .execute();

    expect(member100.at(0)).toEqual(undefined);

    await db
      .insert(membersTable)
      .values({
        id: 'member100',
        name: 'member100',
        email: 'member100@example.com',
      })
      .execute();

    const member100AfterInsert = await db
      .select({ id: membersTable.id })
      .from(membersTable)
      .where(eq(membersTable.id, 'member100'))
      .$withCache({ tag: 'member:member100', config: { ex: 60 } })
      .execute();

    expect(member100AfterInsert.at(0)).toEqual({ id: 'member100' });
  });
});
