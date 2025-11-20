import { createRole } from '~~/server/utils/db/roles';
import { requireAuthPermission } from '~~/server/utils/guards/permission';
import { Permissions } from '~~/server/utils/permission';
import {
  CreateRoleRequestSchema,
  type RoleResponse,
} from '~~/shared/contracts/roles/role';

/**
 * 創建新角色
 * POST /api/roles
 * 權限：ROLE_ADMIN
 */
export default defineEventHandler(async (event) => {
  const db = useDrizzle();
  await requireAuthPermission(db, event, Permissions.ROLE_ADMIN);

  const body = await readValidatedBody(event, (data) =>
    CreateRoleRequestSchema.parse(data)
  );

  const role = await createRole(db, {
    name: body.name,
    description: body.description,
    permissions: body.permissions,
    rank: body.rank,
    discordRoleRefID: body.discordRoleRefID,
  });

  if (!role) {
    throw createError({
      statusCode: 500,
      message: 'Failed to create role',
    });
  }

  return role satisfies RoleResponse;
});
