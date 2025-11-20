import { getRoleById, updateRole } from '~~/server/utils/db/roles';
import { requireAuthPermission } from '~~/server/utils/guards/permission';
import { Permissions } from '~~/server/utils/permission';
import {
  type RoleResponse,
  UpdateRoleRequestSchema,
} from '~~/shared/contracts/roles/role';

/**
 * 更新角色資訊
 * PATCH /api/roles/:id
 * 權限：ROLE_EDIT
 */
export default defineEventHandler(async (event) => {
  const db = useDrizzle();
  await requireAuthPermission(db, event, Permissions.ROLE_EDIT);

  const roleID = getRouterParam(event, 'id');
  if (!roleID) {
    throw createError({
      statusCode: 400,
      message: 'Role ID is required',
    });
  }

  const body = await readValidatedBody(event, (data) =>
    UpdateRoleRequestSchema.parse(data)
  );

  // 檢查角色是否存在
  const existingRole = await getRoleById(db, roleID);
  if (!existingRole) {
    throw createError({
      statusCode: 404,
      message: 'Role not found',
    });
  }

  const updatedRole = await updateRole(db, roleID, {
    name: body.name,
    description: body.description,
    permissions: body.permissions,
    rank: body.rank,
    discordRoleRefID: body.discordRoleRefID,
  });

  if (!updatedRole) {
    throw createError({
      statusCode: 500,
      message: 'Failed to update role',
    });
  }

  return updatedRole satisfies RoleResponse;
});
