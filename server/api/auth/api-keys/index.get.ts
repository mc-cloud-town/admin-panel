import { listMemberAPIKeys } from '~~/server/utils/auth/apiKey';

/**
 * 取得當前成員的所有 API Keys
 * GET /api/auth/api-keys
 */
export default defineEventHandler(async (event) => {
  const session = await getAuthSession(event);
  const { offset, limit } = getQuery<{ offset?: string; limit?: string }>(
    event
  );

  if (!session?.user) {
    throw createError({
      statusCode: 401,
      message: 'Unauthorized',
    });
  }

  const keys = await listMemberAPIKeys(useDrizzle(), session.user.id, {
    offset: safeConversionToNumber(offset),
    limit: safeConversionToNumber(limit),
  });

  return keys.map((key) => ({
    id: key.id,
    name: key.name,
    displayKey: `${key.prefix}${key.start}...${'*'.repeat(24)}`,
    permissions: key.permissions,
    enabled: key.enabled,
    rateLimitEnabled: key.rateLimitEnabled,
    rateLimitMax: key.rateLimitMax,
    remaining: key.remaining,
    lastRequest: key.lastRequest,
    expiresAt: key.expiresAt,
    createdAt: key.createdAt,
    updatedAt: key.updatedAt,
    requestCount: key.requestCount,
  }));
});
