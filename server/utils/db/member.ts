import type { SQL } from 'drizzle-orm';
import { eq, or } from 'drizzle-orm';
import type { drizzle } from 'drizzle-orm/node-postgres';

import type { MemberFields, RoleSelectFields } from '~~/server/database/schema';
import {
  eventMembersTable,
  eventsTable,
  memberRolesTable,
  membersTable,
  rolesTable,
} from '~~/server/database/schema';

import type { MemberID } from '../type';
import { hasPermission } from './permission';

export const getMemberRoles = async <
  P extends Partial<RoleSelectFields> = object
>(
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
  if (include === 'direct') {
    condition = eq(memberRolesTable.memberRefID, memberID);
  } else if (include === 'event') {
    condition = eq(eventMembersTable.memberRefID, memberID);
  } else {
    condition = or(
      eq(memberRolesTable.memberRefID, memberID),
      eq(eventMembersTable.memberRefID, memberID)
    )!;
  }

  return rolesQuery.where(condition).execute();
};

export const getMember = async <P extends Partial<MemberFields>>(
  db: ReturnType<typeof drizzle>,
  memberID: MemberID,
  fields?: P
) => {
  const memberQuery = db
    .select({ id: membersTable.id, ...fields } as P & {
      id: MemberFields['id'];
    })
    .from(membersTable);
  memberQuery.where(eq(membersTable.id, memberID));

  return memberQuery.execute();
};

export const hasMemberWithPermissions = async (
  db: ReturnType<typeof drizzle>,
  memberOrMemberID: MemberID | { id: MemberID; permissions: number },
  permission: number | number[]
) => {
  let member: { id: MemberID; permissions: number } | null = null;
  if (typeof memberOrMemberID === 'string') {
    member = await getMember(db, memberOrMemberID, {
      permissions: membersTable.permissions,
    })
      .then((res) => res.at(0) || null)
      .catch(() => null);
  } else member = memberOrMemberID;

  if (!member) return false;
  if (hasPermission(member.permissions, permission)) {
    return true;
  }

  const roles = await getMemberRoles(db, member.id, {
    permissions: rolesTable.permissions,
  });
  return roles.some((role) => hasPermission(role.permissions, permission));
};
