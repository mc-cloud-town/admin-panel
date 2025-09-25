import { beforeAll,describe, expect, it } from 'vitest';

import {
  eventMembersTable,
  eventsTable,
  memberRolesTable,
  membersTable,
  rolesTable,
} from '~~/server/database/schema';
import { getMemberRoles } from '~~/server/utils/db/member';
import { Permissions } from '~~/server/utils/permission';
import { resetDB,useTestDB } from '~~/tests/utils/db.utils';

let ctx: Awaited<ReturnType<typeof setupMembersData>>;

export const setupMembersData = async () => {
  const db = useTestDB();
  await resetDB();

  const [member1, member2, member3] = await db
    .insert(membersTable)
    .values([
      { id: 'm1', name: 'HaHa1', email: 'test1@mc-ctec.org' },
      { id: 'm2', name: 'HaHa2', email: 'test2@mc-ctec.org' },
      { id: 'm3', name: 'HaHa3', email: 'test3@mc-ctec.org' },
    ])
    .returning();

  const [role1, role2, role3] = await db
    .insert(rolesTable)
    .values([
      { name: 'Role1' },
      { name: 'Role2', permissions: Permissions.ROLE_VIEW },
      { name: 'Role3 - Event', permissions: Permissions.ROLE_ADMIN },
    ])
    .returning();

  await db.insert(memberRolesTable).values([
    { memberRefID: member1.id, roleRefID: role1.id },
    { memberRefID: member1.id, roleRefID: role2.id },
    { memberRefID: member2.id, roleRefID: role2.id },
    { memberRefID: member3.id, roleRefID: role1.id },
  ]);

  const [event1, event2] = await db
    .insert(eventsTable)
    .values([
      { name: 'Event 1', roleRefID: role1.id },
      { name: 'Event 2', roleRefID: role3.id },
    ])
    .returning();

  await db.insert(eventMembersTable).values([
    { eventRefID: event1.id, memberRefID: member3.id },
    { eventRefID: event2.id, memberRefID: member3.id },
  ]);

  return { member1, member2, member3, role1, role2, role3, event1, event2 };
};

beforeAll(async () => {
  ctx = await setupMembersData();
});

describe('getMemberRoles', () => {
  const db = useTestDB();

  it('should return all member roles correctly', async () => {
    const { member1, member2, member3, role1, role2, role3 } = ctx;

    const testCases = [
      { memberID: member1.id, expectedRoles: [role1.id, role2.id] },
      { memberID: member2.id, expectedRoles: [role2.id] },
      { memberID: member3.id, expectedRoles: [role1.id, role3.id] },
    ];

    for (const { memberID, expectedRoles } of testCases) {
      const roles = await getMemberRoles(db, memberID, {});

      expect(roles.map((r) => r.id).sort()).toEqual(expectedRoles.sort());
    }
  });

  it('should return empty array for unknown member', async () => {
    const roles = await getMemberRoles(db, '_m999', { id: rolesTable.id });

    expect(roles).toEqual([]);
  });

  it('should return only selected columns', async () => {
    const roles = await getMemberRoles(db, ctx.member1.id, {
      id: rolesTable.id,
    });

    expect(roles.map((r) => r.id).sort()).toEqual(
      [ctx.role1.id, ctx.role2.id].sort()
    );
  });

  it('should return roles only from direct membership when include="direct"', async () => {
    const roles = await getMemberRoles(
      db,
      ctx.member3.id,
      { id: rolesTable.id },
      'direct'
    );

    expect(roles.map((r) => r.id)).toEqual([ctx.role1.id]);
  });

  it('should return roles only from event membership when include="event"', async () => {
    const roles = await getMemberRoles(
      db,
      ctx.member3.id,
      { id: rolesTable.id },
      'event'
    );

    expect(roles.map((r) => r.id).sort()).toEqual(
      [ctx.role1.id, ctx.role3.id].sort()
    );
  });

  it('should return role names correctly', async () => {
    const roles = await getMemberRoles(db, ctx.member1.id, {
      name: rolesTable.name,
    });

    expect(roles.map((r) => r.name).sort()).toEqual(
      [ctx.role1.name, ctx.role2.name].sort()
    );
    expect(roles.map((r) => r.id).sort()).toEqual(
      [ctx.role1.id, ctx.role2.id].sort()
    );
  });
});
