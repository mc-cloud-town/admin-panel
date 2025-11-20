import { getRoleById } from '~~/server/utils/db/roles';
import { requireAuthPermission } from '~~/server/utils/guards/permission';
import { Permissions } from '~~/server/utils/permission';
import type { RoleResponse } from '~~/shared/contracts/roles/role';

/**
 * 取得單一角色詳細資訊
 * GET /api/roles/:id
 * 權限：ROLE_VIEW
 */
export default defineEventHandler(async (event) => {
  const db = useDrizzle();
  await requireAuthPermission(db, event, Permissions.ROLE_VIEW);

  const roleID = getRouterParam(event, 'id');
  if (!roleID) {
    throw createError({
      statusCode: 400,
      message: 'Role ID is required',
    });
  }

  const role = await getRoleById(db, roleID);

  if (!role) {
    throw createError({
      statusCode: 404,
      message: 'Role not found',
    });
  }

  return role satisfies RoleResponse;
});
