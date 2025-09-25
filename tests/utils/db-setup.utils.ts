import {
  eventMembersTable,
  eventsTable,
  memberRolesTable,
  membersTable,
  rolesTable,
} from '~~/server/database/schema';
import { Permissions } from '~~/server/utils/permission';

import { resetDB, useTestDB } from './db.utils';

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
