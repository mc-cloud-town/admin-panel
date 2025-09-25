import { sql } from 'drizzle-orm';
import type { PgColumn } from 'drizzle-orm/pg-core';

export const hasPermission = (
  permissions: number,
  requiredPermissions: number | number[]
) => {
  if (Array.isArray(requiredPermissions)) {
    return requiredPermissions.some((perm) => (permissions & perm) === perm);
  }
  return (permissions & requiredPermissions) === requiredPermissions;
};

export const hasPermissionSql = (column: PgColumn, bit: number) =>
  sql`${column}&${bit}=${bit}`;
