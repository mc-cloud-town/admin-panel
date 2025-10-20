import type { H3Event } from 'h3';

import { validateAPIKey } from '~~/server/utils/auth/apiKey';

/**
 * 驗證 API Key 中介層
 * 從 Authorization header 中提取 API key 並驗證
 */
export const validateAPIKeyMiddleware = async (
  event: H3Event,
  requiredPermission?: number | number[]
) => {
  const authHeader = getHeader(event, 'authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw createError({
      statusCode: 401,
      message: 'Missing or invalid authorization header',
    });
  }

  const key = authHeader.slice(7); // 移除 "Bearer " 前綴
  if (!key) {
    throw createError({
      statusCode: 401,
      message: 'API key is required',
    });
  }

  const db = useDrizzle();
  const validation = await validateAPIKey(db, key, requiredPermission);
  if (!validation.valid) {
    if (validation.error === 'Rate limit exceeded') {
      throw createError({
        statusCode: 429,
        message: 'Rate limit exceeded',
        data: {
          resetAt: validation.rateLimit?.resetAt,
          remaining: validation.rateLimit?.remaining,
        },
      });
    }

    throw createError({
      statusCode: 403,
      message: validation.error || 'Invalid API key',
    });
  }

  // 將 API key 資訊和成員 ID 附加到 event.context
  event.context.apiKey = validation.apiKey;
  event.context.memberID = validation.apiKey!.memberRefID;

  // 設定 rate limit headers
  if (validation.rateLimit) {
    setHeader(
      event,
      'X-RateLimit-Remaining',
      String(validation.rateLimit.remaining)
    );
    if (validation.rateLimit.resetAt) {
      setHeader(
        event,
        'X-RateLimit-Reset',
        validation.rateLimit.resetAt.toISOString()
      );
    }
  }

  return validation.apiKey!;
};

/**
 * 從 event 取得成員 ID（支援 session 或 API key）
 */
export const getMemberIDFromEvent = async (
  event: H3Event
): Promise<string | null> => {
  // 優先檢查是否已透過 API key 驗證
  if (event.context.memberID) {
    return event.context.memberID;
  }

  // 否則嘗試從 session 取得
  const session = await getAuthSession(event);
  return session?.user?.id || null;
};
