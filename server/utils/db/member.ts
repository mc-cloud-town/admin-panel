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

import { hasPermission } from '../auth/permission';
import type { MemberID } from '../type';

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

export const getMemberFromId = async <P extends Partial<MemberFields>>(
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

/**
 * 取得成員的所有權限（成員權限 + 所有角色權限的聯集，包含直接角色和事件角色）
 */
export const getMemberPermissions = async (
  db: ReturnType<typeof drizzle>,
  memberID: MemberID
): Promise<number> => {
  const member = await getMemberFromId(db, memberID, {
    permissions: membersTable.permissions,
  }).then((res) => res.at(0) || null);

  if (!member) return 0;

  // 取得所有角色（包含直接角色和事件角色）
  const roles = await getMemberRoles(db, memberID, {
    permissions: rolesTable.permissions,
  });

  // 將成員權限與所有角色權限進行 bitwise OR 運算
  return roles.reduce(
    (acc, role) => acc | (role.permissions || 0),
    member.permissions || 0
  );
};

/**
 * 檢查會員是否擁有指定權限（包含角色權限）
 * @param db 資料庫連線
 * @param memberOrMemberID 會員 ID 或會員物件
 * @param permission 欲檢查的權限
 * @returns
 */
export const hasMemberWithPermissions = async (
  db: ReturnType<typeof drizzle>,
  memberOrMemberID: MemberID | { id: MemberID; permissions: number },
  permission: number | number[]
) => {
  let member: { id: MemberID; permissions: number } | null = null;
  if (typeof memberOrMemberID === 'string') {
    member = await getMemberFromId(db, memberOrMemberID, {
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
