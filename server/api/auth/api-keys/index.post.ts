import { createAPIKey } from '~~/server/utils/auth/apiKey';
import { hasMemberWithPermissions } from '~~/server/utils/db/member';
import { Permissions } from '~~/server/utils/permission';
import { CreateAPIKeyRequestSchema } from '~~/shared/contracts/auth/apiKey';

/**
 * 創建新的 API Key
 * POST /api/auth/api-keys
 */
export default defineEventHandler(async (event) => {
  const session = await getAuthSession(event);
  if (!session?.user) {
    throw createError({ statusCode: 401, message: 'Unauthorized' });
  }

  const body = await readValidatedBody(event, (data) =>
    CreateAPIKeyRequestSchema.parse(data)
  );

  // 檢查是否有創建 API Token 的權限
  const db = useDrizzle();
  const hasPermission = await hasMemberWithPermissions(
    db,
    session.user.id,
    Permissions.API_TOKEN_CREATE
  );

  if (!hasPermission) {
    throw createError({
      statusCode: 403,
      message: 'Insufficient permissions to create API keys',
    });
  }

  const result = await createAPIKey(db, {
    memberRefID: session.user.id,
    name: body.name,
    permissions: body.permissions,
    expiresAt: body.expiresAt,
    prefix: body.prefix,
    rateLimitEnabled: body.rateLimitEnabled,
    rateLimitMax: body.rateLimitMax,
    rateLimitTimeWindow: body.rateLimitTimeWindow,
    refillInterval: body.refillInterval,
    refillAmount: body.refillAmount,
    metadata: body.metadata,
  });

  return {
    id: result.id,
    key: result.key, // 只在創建時返回明文 key
    displayKey: result.displayKey,
    prefix: result.prefix,
    start: result.start,
    createdAt: result.createdAt,
  };
});
