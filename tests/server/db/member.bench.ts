import { bench, describe } from 'vitest';

import { rolesTable } from '~~/server/database/schema';
import { getMemberRoles } from '~~/server/utils/db/member';
import type { TestDBCtx } from '~~/tests/utils/db.utils';
import { withTestDB } from '~~/tests/utils/db.utils';

let dbCtx: TestDBCtx;
beforeAll(async () => {
  const { ctx, close } = await withTestDB();
  dbCtx = ctx;
  return close;
});

describe('Benchmark: getMemberRoles', () => {
  bench('getMemberRoles()', async () => {
    await getMemberRoles(dbCtx.db, dbCtx.member1.id, {
      id: rolesTable.id,
      name: rolesTable.name,
    });
  });
});
