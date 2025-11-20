import { eq } from 'drizzle-orm';

import { apiKeyTable } from '~~/server/database/schema';
import { hasMemberWithPermissions } from '~~/server/utils/db/member';
import { requireSession } from '~~/server/utils/guards/permission';
import { Permissions } from '~~/server/utils/permission';

/**
 * 取得 API Key 詳細資訊
 * GET /api/auth/api-keys/:id
 * 權限：API_TOKEN_CREATE（查看自己的）或 API_TOKEN_ADMIN（查看所有）
 */
export default defineEventHandler(async (event) => {
  const db = useDrizzle();
  const { user } = await requireSession(
    db,
    event,
    Permissions.API_TOKEN_CREATE
  );
  const keyID = getRouterParam(event, 'id');
  if (!keyID) {
    throw createError({
      statusCode: 400,
      message: 'API Key ID is required',
    });
  }

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
  if (apiKey.memberRefID !== user.id) {
    const hasAdminPermission = await hasMemberWithPermissions(
      db,
      user.id,
      Permissions.API_TOKEN_ADMIN
    );

    if (!hasAdminPermission) {
      throw createError({
        statusCode: 403,
        message: 'Insufficient permissions to view this API key',
      });
    }
  }

  return {
    id: apiKey.id,
    name: apiKey.name,
    displayKey: `${apiKey.prefix}${apiKey.start}...${'*'.repeat(24)}`,
    prefix: apiKey.prefix,
    start: apiKey.start,
    permissions: apiKey.permissions,
    enabled: apiKey.enabled,
    rateLimitEnabled: apiKey.rateLimitEnabled,
    rateLimitMax: apiKey.rateLimitMax,
    rateLimitTimeWindow: apiKey.rateLimitTimeWindow,
    refillInterval: apiKey.refillInterval,
    refillAmount: apiKey.refillAmount,
    remaining: apiKey.remaining,
    lastRefillAt: apiKey.lastRefillAt,
    lastRequest: apiKey.lastRequest,
    requestCount: apiKey.requestCount,
    expiresAt: apiKey.expiresAt,
    createdAt: apiKey.createdAt,
    updatedAt: apiKey.updatedAt,
    metadata: apiKey.metadata,
    memberRefID: apiKey.memberRefID,
  };
});
