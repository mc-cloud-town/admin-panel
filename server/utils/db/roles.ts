import { count, eq } from 'drizzle-orm';
import type { drizzle } from 'drizzle-orm/node-postgres';

import { rolesTable } from '~~/server/database/schema';
import type { RoleID } from '~~/server/utils/type';

/**
 * 取得所有角色
 */
export const getRoles = async (
  db: ReturnType<typeof drizzle>,
  options: {
    offset?: number;
    limit?: number;
    orderBy?: 'rank' | 'name' | 'createdAt';
    order?: 'asc' | 'desc';
  } = {}
) => {
  const { offset = 0, limit = 100, orderBy = 'rank', order = 'asc' } = options;

  const orderColumn =
    orderBy === 'rank'
      ? rolesTable.rank
      : orderBy === 'name'
      ? rolesTable.name
      : rolesTable.createdAt;

  const roles = await db
    .select()
    .from(rolesTable)
    .orderBy(order === 'asc' ? orderColumn : orderColumn)
    .limit(limit)
    .offset(offset);

  const [{ total }] = await db.select({ total: count() }).from(rolesTable);

  return { roles, total };
};

/**
 * 根據 ID 取得角色
 */
export const getRoleById = async (
  db: ReturnType<typeof drizzle>,
  roleID: RoleID
) => {
  return db
    .select()
    .from(rolesTable)
    .where(eq(rolesTable.id, roleID))
    .limit(1)
    .then((res) => res.at(0) ?? null);
};

/**
 * 創建新角色
 */
export const createRole = async (
  db: ReturnType<typeof drizzle>,
  data: {
    name: string;
    description?: string;
    permissions?: number;
    rank?: number;
    discordRoleRefID?: number;
  }
) => {
  const result = await db
    .insert(rolesTable)
    .values({
      name: data.name,
      description: data.description,
      permissions: data.permissions ?? 0,
      rank: data.rank ?? 0,
      discordRoleRefID: data.discordRoleRefID,
    })
    .returning();

  return result.at(0) ?? null;
};

/**
 * 更新角色
 */
export const updateRole = async (
  db: ReturnType<typeof drizzle>,
  roleID: RoleID,
  data: {
    name?: string;
    description?: string | null;
    permissions?: number;
    rank?: number;
    discordRoleRefID?: number | null;
  }
) => {
  const result = await db
    .update(rolesTable)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(eq(rolesTable.id, roleID))
    .returning();

  return result.at(0) ?? null;
};

/**
 * 刪除角色
 */
export const deleteRole = async (
  db: ReturnType<typeof drizzle>,
  roleID: RoleID
) => {
  const result = await db
    .delete(rolesTable)
    .where(eq(rolesTable.id, roleID))
    .returning({ id: rolesTable.id });

  return result.at(0) ?? null;
};
