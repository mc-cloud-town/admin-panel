import { eq } from 'drizzle-orm';

import { apiKeyTable } from '~~/server/database/schema';
import { deleteAPIKey } from '~~/server/utils/auth';
import { checkPermission } from '~~/server/utils/guards/permission';
import { Permissions } from '~~/server/utils/permission';

/**
 * 刪除 API Key
 * DELETE /api/auth/api-keys/:id
 * 權限：API_TOKEN_CREATE（刪除自己的）或 API_TOKEN_ADMIN（刪除所有）
 */
export default defineEventHandler(async (event) => {
  const session = await getAuthSession(event);
  if (!session?.user) {
    throw createError({
      statusCode: 401,
      message: 'Unauthorized',
    });
  }

  const keyID = getRouterParam(event, 'id');
  if (!keyID) {
    throw createError({
      statusCode: 400,
      message: 'API Key ID is required',
    });
  }

  const db = useDrizzle();

  // 檢查 API Key 是否存在且屬於當前用戶
  const apiKey = await db
    .select()
    .from(apiKeyTable)
    .where(eq(apiKeyTable.id, keyID))
    .limit(1)
    .then((x) => x.at(0) ?? null);

  if (apiKey === null) {
    throw createError({
      statusCode: 404,
      message: 'API Key not found',
    });
  }

  // 如果不是自己的 key，檢查是否有管理權限
  if (apiKey.memberRefID !== session.user.id) {
    const hasAdminPermission = await checkPermission(
      db,
      event,
      Permissions.API_TOKEN_ADMIN
    );

    if (!hasAdminPermission) {
      throw createError({
        statusCode: 403,
        message: 'Insufficient permissions to delete this API key',
      });
    }
  }

  const deleted = await deleteAPIKey(db, keyID);
  if (!deleted) {
    throw createError({
      statusCode: 500,
      message: 'Failed to delete API key',
    });
  }

  return { success: true };
});
