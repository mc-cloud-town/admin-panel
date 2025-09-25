import { bench, describe } from 'vitest';

import { rolesTable } from '~~/server/database/schema';
import { getMemberRoles } from '~~/server/utils/db/member';
import { useTestDB } from '~~/tests/utils/db.utils';

describe('Benchmark: getMemberRoles', () => {
  const db = useTestDB();

  bench('getMemberRoles()', async () => {
    await getMemberRoles(db, dbCtx.member1.id, {
      id: rolesTable.id,
      name: rolesTable.name,
    });
  });
});
