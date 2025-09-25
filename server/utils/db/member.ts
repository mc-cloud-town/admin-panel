import type { SQL } from 'drizzle-orm';
import { eq, or } from 'drizzle-orm';
import type { drizzle } from 'drizzle-orm/node-postgres';

import {
  eventMembersTable,
  eventsTable,
  memberRolesTable,
  rolesTable,
} from '~~/server/database/schema';

type RoleSelectFields = (typeof rolesTable)['_']['columns'];

export const getMemberRoles = async <P extends Partial<RoleSelectFields>>(
  db: ReturnType<typeof drizzle>,
  memberID: MemberID,
  fields: P = {} as P,
  include: 'all' | 'direct' | 'event' = 'all'
) => {
  const rolesQuery = db
    .selectDistinctOn([rolesTable.id], {
      id: rolesTable.id,
      ...fields,
    } as P & { id: RoleSelectFields['id'] })
    .from(rolesTable);

  rolesQuery.leftJoin(
    memberRolesTable,
    eq(memberRolesTable.roleRefID, rolesTable.id)
  );
  rolesQuery.leftJoin(eventsTable, eq(eventsTable.roleRefID, rolesTable.id));
  rolesQuery.leftJoin(
    eventMembersTable,
    eq(eventMembersTable.eventRefID, eventsTable.id)
  );

  let condition: SQL;
  if (include === 'direct')
    condition = eq(memberRolesTable.memberRefID, memberID);
  else if (include === 'event') {
    condition = eq(eventMembersTable.memberRefID, memberID);
  } else {
    condition = or(
      eq(memberRolesTable.memberRefID, memberID),
      eq(eventMembersTable.memberRefID, memberID)
    )!;
  }

  return rolesQuery.where(condition).execute();
};
