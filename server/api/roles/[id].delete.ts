import { deleteRole, getRoleById } from '~~/server/utils/db/roles';
import { requireAuthPermission } from '~~/server/utils/guards/permission';
import { Permissions } from '~~/server/utils/permission';

/**
 * 刪除角色
 * DELETE /api/roles/:id
 * 權限：ROLE_ADMIN
 */
export default defineEventHandler(async (event) => {
  const db = useDrizzle();
  await requireAuthPermission(db, event, Permissions.ROLE_ADMIN);

  const roleID = getRouterParam(event, 'id');
  if (!roleID) {
    throw createError({
      statusCode: 400,
      message: 'Role ID is required',
    });
  }

  // 檢查角色是否存在
  const existingRole = await getRoleById(db, roleID);
  if (!existingRole) {
    throw createError({
      statusCode: 404,
      message: 'Role not found',
    });
  }

  const result = await deleteRole(db, roleID);

  if (!result) {
    throw createError({
      statusCode: 500,
      message: 'Failed to delete role',
    });
  }

  return {
    success: true,
    id: result.id,
  };
});
