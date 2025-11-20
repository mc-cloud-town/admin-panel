import { getRoles } from '~~/server/utils/db/roles';
import { requireAuthPermission } from '~~/server/utils/guards/permission';
import { Permissions } from '~~/server/utils/permission';
import type { RoleListResponse } from '~~/shared/contracts/roles/role';

/**
 * 取得角色列表
 * GET /api/roles
 * 權限：ROLE_VIEW
 */
export default defineEventHandler(async (event) => {
  const db = useDrizzle();
  await requireAuthPermission(db, event, Permissions.ROLE_VIEW);

  const query = getQuery<{
    offset?: string;
    limit?: string;
    orderBy?: 'rank' | 'name' | 'createdAt';
    order?: 'asc' | 'desc';
  }>(event);

  const { roles, total } = await getRoles(db, {
    offset: safeConversionToNumber(query.offset),
    limit: safeConversionToNumber(query.limit),
    orderBy: query.orderBy,
    order: query.order,
  });

  return {
    roles,
    total,
  } satisfies RoleListResponse;
});
