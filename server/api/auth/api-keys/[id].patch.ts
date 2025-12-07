import { eq } from 'drizzle-orm';
import { parse } from 'valibot';

import { apiKeyTable } from '~~/server/database/schema';
import { updateAPIKey } from '~~/server/utils/auth';
import { hasMemberWithPermissions } from '~~/server/utils/db/member';
import { Permissions } from '~~/server/utils/permission';
import { UpdateAPIKeyRequestSchema } from '~~/shared/contracts/auth/apiKey';

/**
 * 更新 API Key
 * PATCH /api/auth/api-keys/:id
 * 權限：API_TOKEN_CREATE（更新自己的）或 API_TOKEN_ADMIN（更新所有）
 */
export default defineEventHandler(async (event) => {
  const session = await auth.api.getSession({ headers: event.headers });
  if (!session?.user) {
    throw createError({
      statusCode: 401,
      message: 'Unauthorized',
    });
  }

  const body = await readValidatedBody(event, (data) =>
    parse(UpdateAPIKeyRequestSchema, data)
  );

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
    const hasAdminPermission = await hasMemberWithPermissions(
      db,
      session.user.id,
      Permissions.API_TOKEN_ADMIN
    );

    if (!hasAdminPermission) {
      throw createError({
        statusCode: 403,
        message: 'Insufficient permissions to update this API key',
      });
    }
  }

  const updated = await updateAPIKey(db, keyID, body);
  if (!updated) {
    throw createError({
      statusCode: 500,
      message: 'Failed to update API key',
    });
  }

  return {
    id: updated.id,
    name: updated.name,
    start: `${updated.prefix}${updated.start}`,
    permissions: updated.permissions,
    enabled: updated.enabled,
    rateLimitEnabled: updated.rateLimitEnabled,
    rateLimitMax: updated.rateLimitMax,
    remaining: updated.remaining,
    lastRequest: updated.lastRequest,
    expiresAt: updated.expiresAt,
    createdAt: updated.createdAt,
    updatedAt: updated.updatedAt,
  };
});
