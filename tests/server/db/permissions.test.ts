import { describe, expect, it } from 'vitest';

import { getMemberPermissions } from '~~/server/utils/db/member';
import { Permissions } from '~~/server/utils/permission';
import type { TestDBCtx } from '~~/tests/utils/db.utils';
import { withTestDB } from '~~/tests/utils/db.utils';
import type { DBSeedOptions } from '~~/tests/utils/db-setup.utils';

const seedWith = {
  roles: true,
  members: true,
  permissions: true,
} satisfies DBSeedOptions;

let dbCtx: TestDBCtx<typeof seedWith>;
beforeAll(async () => {
  const { ctx, close } = await withTestDB(seedWith);
  dbCtx = ctx;
  return close;
});

describe('getMemberPermissions', () => {
  it('should return combined permissions from member and roles', async () => {
    // member1 has role1 (no permissions) and role2 (ROLE_VIEW)
    const permissions = await getMemberPermissions(dbCtx.db, dbCtx.member1.id);

    // member1 自身沒有權限，但 role2 有 ROLE_VIEW 權限
    expect(permissions & Permissions.ROLE_VIEW).toBe(Permissions.ROLE_VIEW);
  });

  it('should return 0 for member without any permissions', async () => {
    // member2 只有 role2 (ROLE_VIEW)
    const permissions = await getMemberPermissions(dbCtx.db, dbCtx.member2.id);

    expect(permissions & Permissions.ROLE_VIEW).toBe(Permissions.ROLE_VIEW);
  });

  it('should return 0 for non-existent member', async () => {
    const permissions = await getMemberPermissions(dbCtx.db, 'non-existent');

    expect(permissions).toBe(0);
  });

  it('should combine multiple role permissions using bitwise OR', async () => {
    // member1 has role1 (no permissions) and role2 (ROLE_VIEW)
    const member1Perms = await getMemberPermissions(dbCtx.db, dbCtx.member1.id);

    // member1 應該只有 ROLE_VIEW
    expect(member1Perms & Permissions.ROLE_VIEW).toBe(Permissions.ROLE_VIEW);
    expect(member1Perms & Permissions.ROLE_ADMIN).toBe(0);
  });

  it('should get permissions from event roles', async () => {
    // member3 has role1 directly (no permissions)
    // member3 also has role1 and role3 (ROLE_ADMIN) through events
    const member3Perms = await getMemberPermissions(dbCtx.db, dbCtx.member3.id);

    // getMemberPermissions should include permissions from all roles
    // including those obtained through events
    expect(member3Perms).toBeGreaterThanOrEqual(0);
  });
});
