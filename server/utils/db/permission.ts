import { and, eq, sql } from 'drizzle-orm';
import type { PgColumn } from 'drizzle-orm/pg-core';

import { membersTable } from '~~/server/database/schema';

export const hasPermissionSql = (column: PgColumn, bit: number) =>
  sql`${column}&${bit}=${bit}`;

export const hasMemberWithPermissions = async (
  memberID: MemberID,
  permission: number
) => {
  await useDrizzle()
    .select()
    .from(membersTable)
    .where(
      and(
        eq(membersTable.id, memberID),
        hasPermissionSql(membersTable.permissions, permission)
      )
    )
    .limit(1)
    .execute();
};
