import { describe, expect, expectTypeOf, it } from 'vitest';

import { membersTable, rolesTable } from '~~/server/database/schema';
import {
  getMember,
  getMemberRoles,
  hasMemberWithPermissions,
} from '~~/server/utils/db/member';
import { Permissions } from '~~/server/utils/permission';
import { type TestDBCtx, withTestDB } from '~~/tests/utils/db.utils';
import type { DBSeedOptions } from '~~/tests/utils/db-setup.utils';

const seedWith = {
  roles: true,
  events: true,
  members: true,
  permissions: true,
} satisfies DBSeedOptions;

let dbCtx: TestDBCtx<typeof seedWith>;
beforeAll(async () => {
  const { ctx, close } = await withTestDB(seedWith);
  dbCtx = ctx;
  return close;
});

describe('getMemberRoles', () => {
  it('should return all member roles correctly', async () => {
    const { member1, member2, member3, role1, role2, role3 } = dbCtx;

    const testCases = [
      { memberID: member1.id, expectedRoles: [role1.id, role2.id] },
      { memberID: member2.id, expectedRoles: [role2.id] },
      { memberID: member3.id, expectedRoles: [role1.id, role3.id] },
    ];

    for (const { memberID, expectedRoles } of testCases) {
      const roles = await getMemberRoles(dbCtx.db, memberID, {});

      expectTypeOf(roles).toEqualTypeOf<{ id: string }[]>();
      expect(roles.map((r) => r.id).sort()).toEqual(expectedRoles.sort());
    }
  });

  it('should return empty array for unknown member', async () => {
    const roles = await getMemberRoles(dbCtx.db, '_m999', {
      id: rolesTable.id,
      name: rolesTable.name,
    });

    expect(roles).toEqual([]);
  });

  it('should return only selected columns', async () => {
    const roles = await getMemberRoles(dbCtx.db, dbCtx.member1.id);

    expect(roles.map((r) => r.id).sort()).toEqual(
      [dbCtx.role1.id, dbCtx.role2.id].sort()
    );
  });

  it('should return roles only from direct membership when include="direct"', async () => {
    const roles = await getMemberRoles(
      dbCtx.db,
      dbCtx.member3.id,
      { id: rolesTable.id },
      'direct'
    );

    expect(roles.map((r) => r.id)).toEqual([dbCtx.role1.id]);
  });

  it('should return roles only from event membership when include="event"', async () => {
    const roles = await getMemberRoles(
      dbCtx.db,
      dbCtx.member3.id,
      { id: rolesTable.id },
      'event'
    );

    expect(roles.map((r) => r.id).sort()).toEqual(
      [dbCtx.role1.id, dbCtx.role3.id].sort()
    );
  });

  it('should return role names correctly', async () => {
    const roles = await getMemberRoles(dbCtx.db, dbCtx.member1.id, {
      name: rolesTable.name,
    });

    expect(roles.map((r) => r.name).sort()).toEqual(
      [dbCtx.role1.name, dbCtx.role2.name].sort()
    );
    expect(roles.map((r) => r.id).sort()).toEqual(
      [dbCtx.role1.id, dbCtx.role2.id].sort()
    );
  });

  it('should return member by id', async () => {
    const member = await getMember(dbCtx.db, dbCtx.member1.id, {
      name: membersTable.name,
    });

    expect(member.at(0)?.id).toBe(dbCtx.member1.id);
    expect(member.at(0)?.name).toBe(dbCtx.member1.name);
  });

  it('should return only selected fields', async () => {
    const member = await getMember(dbCtx.db, dbCtx.member2.id, {
      email: membersTable.email,
    });

    expect(member.at(0)).toEqual({
      id: dbCtx.member2.id,
      email: dbCtx.member2.email,
    });
  });

  it('should return empty array when member not found', async () => {
    const result = await getMember(dbCtx.db, 'm999');
    expect(result).toEqual([]);
  });

  it('should return member permissions correctly', async () => {
    const perm = await hasMemberWithPermissions(
      dbCtx.db,
      dbCtx.member1.id,
      Permissions.ROLE_VIEW
    );

    expect(perm).toBe(true);
  });
});
