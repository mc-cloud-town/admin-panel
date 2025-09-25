import { beforeAll, bench, describe } from 'vitest';

import { rolesTable } from '~~/server/database/schema';
import { getMemberRoles } from '~~/server/utils/db/member';
import { useTestDB } from '~~/tests/utils/db.utils';

import { setupMembersData } from './member.test';

let ctx: Awaited<ReturnType<typeof setupMembersData>>;

export const setupBenchmarkData = async () => {
  ctx = await setupMembersData();
};

beforeAll(async () => {
  await setupBenchmarkData();
});

describe('Benchmark: getMemberRoles', () => {
  const db = useTestDB();

  bench('getMemberRoles()', async () => {
    await getMemberRoles(db, ctx.member1.id, {
      id: rolesTable.id,
      name: rolesTable.name,
    });
  });
});
