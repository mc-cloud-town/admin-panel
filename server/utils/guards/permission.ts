import type { H3Event } from 'h3';

import type { apiKeyTable } from '~~/server/database/schema';
import { validateAPIKey } from '~~/server/utils/auth';
import { hasMemberWithPermissions } from '~~/server/utils/db/member';
import { hasPermission } from '~~/server/utils/db/permission';
import type { Permissions } from '~~/server/utils/permission';

/**
 * API 權限檢查 Guard
 * 支援 Session 和 API Key 兩種認證方式
 *
 * @param event H3 Event
 * @param customPermissions 可選：自訂權限要求，覆蓋預設配置
 * @param mode 認證模式：'api' 僅 API Key，'session' 僅 Session，'both' 兩者皆可
 * @returns 包含 user 和 db 的物件
 * @throws 401 未登入或 API Key 無效
 * @throws 403 權限不足
 */
export const requirePermission = async (
  db: ReturnType<typeof useDrizzle>,
  event: H3Event,
  customPermissions?: Permissions | Permissions[],
  mode: 'api' | 'session' | 'both' = 'both'
) => {
  // 嘗試使用 API Key 認證
  if (mode === 'api' || mode === 'both') {
    const apiKeyValidation = await validateApiKeyFromHeader(db, event);
    if (apiKeyValidation) {
      const validatedApiKey = await checkApiKeyPermission(apiKeyValidation, {
        permission: customPermissions,
        requireEnabled: true,
        expiredCheck: true,
      });

      if (validatedApiKey && validatedApiKey.apiKey) {
        // API Key 認證成功，返回模擬的 user 物件
        return {
          user: {
            id: validatedApiKey.apiKey.memberRefID,
            isApiKey: true,
            apiKeyId: validatedApiKey.apiKey.id,
          },
          db,
        };
      }

      // API Key 存在但驗證失敗
      if (mode === 'api') {
        throw createError({
          statusCode: 403,
          message: 'Invalid API key or insufficient permissions',
        });
      }
    } else if (mode === 'api') {
      // 僅 API Key 模式但未提供
      throw createError({
        statusCode: 401,
        message: 'API key is required',
      });
    }
  }

  // 嘗試使用 Session 認證
  const session = await getAuthSession(event);
  if (!session?.user) {
    throw createError({
      statusCode: 401,
      message: 'Unauthorized',
    });
  }

  // 如果沒有權限要求，直接返回
  if (customPermissions === undefined) {
    return { user: session.user, db };
  }

  // 檢查 Session 使用者權限
  const hasRequiredPermission = await hasMemberWithPermissions(
    db,
    session.user.id,
    customPermissions
  );

  if (!hasRequiredPermission) {
    throw createError({
      statusCode: 403,
      message: 'Insufficient permissions',
    });
  }

  return { user: session.user, db };
};

/**
 * 檢查使用者是否具有指定權限（不拋出錯誤）
 *
 * @param db Drizzle database instance
 * @param event H3 Event
 * @param permissions 需要檢查的權限
 * @returns 是否具有權限
 */
export const checkPermission = async (
  db: ReturnType<typeof useDrizzle>,
  event: H3Event,
  permissions: Permissions | Permissions[]
): Promise<boolean> => {
  const session = await getAuthSession(event);
  if (!session?.user) {
    return false;
  }

  return hasMemberWithPermissions(db, session.user.id, permissions);
};

/**
 * 從 HTTP Authorization header 中提取並驗證 API Key
 *
 * @param db Drizzle database instance
 * @param event H3 Event
 * @returns 驗證結果，若無效則返回 null
 */
export const validateApiKeyFromHeader = async (
  db: ReturnType<typeof useDrizzle>,
  event: H3Event
) => {
  const authHeader = getHeader(event, 'authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const key = authHeader.slice(7); // 移除 "Bearer " 前綴
  if (!key) {
    return null;
  }

  return await validateAPIKey(db, key);
};

/**
 * 檢查 API Key 權限、啟用狀態和過期時間
 *
 * @param db Drizzle database instance
 * @param apiKey 已驗證的 API Key 物件
 * @param options 檢查選項
 * @param options.permission 需要的權限（可選）
 * @param options.requireEnabled 是否要求 API Key 啟用狀態，預設 true
 * @param options.expiredCheck 是否檢查過期時間，預設 true
 * @returns 驗證通過返回 apiKey，否則返回 null
 */
export const checkApiKeyPermission = async (
  apiKey: Awaited<ReturnType<typeof validateAPIKey>>,
  options: {
    permission?: number | number[];
    requireEnabled?: boolean;
    expiredCheck?: boolean;
  } = {}
) => {
  const { permission, requireEnabled = true, expiredCheck = true } = options;

  // 基本驗證
  if (apiKey === null || !apiKey.valid || apiKey.apiKey === null) {
    return null;
  }

  // 檢查啟用狀態
  if (requireEnabled && !apiKey.apiKey.enabled) {
    return null;
  }

  // 檢查過期時間
  if (
    expiredCheck &&
    apiKey.apiKey.expiresAt &&
    apiKey.apiKey.expiresAt < new Date()
  ) {
    return null;
  }

  // 檢查權限
  if (permission !== undefined) {
    const hasPerm = hasPermission(apiKey.apiKey.permissions, permission);
    if (!hasPerm) {
      return null;
    }
  }

  return apiKey;
};

/**
 * API Key 驗證 Middleware
 * 從 Authorization header 驗證 API Key 並檢查權限、速率限制等
 *
 * @param event H3 Event
 * @param requiredPermission 需要的權限（可選）
 * @returns 驗證成功的 API Key 物件
 * @throws 401 缺少或無效的 Authorization header
 * @throws 403 API Key 無效或權限不足
 * @throws 429 速率限制超出
 */
export const validateAPIKeyMiddleware = async (
  event: H3Event,
  requiredPermission?: Permissions | Permissions[]
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
  const validation = await validateAPIKey(
    db,
    key,
    requiredPermission
      ? Array.isArray(requiredPermission)
        ? requiredPermission
        : [requiredPermission]
      : undefined
  );

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
 * 組合型 Guard：支援 Session 或 API Key 認證
 * 優先檢查 Session，若無 Session 則檢查 API Key
 *
 * @param event H3 Event
 * @param requiredPermission 需要的權限（可選）
 * @returns 包含認證資訊的物件
 * @throws 401 未認證
 * @throws 403 權限不足
 */
export const requireAuth = async (
  db: ReturnType<typeof useDrizzle>,
  event: H3Event,
  requiredPermission?: Permissions | Permissions[]
) => {
  return requirePermission(db, event, requiredPermission, 'both');
};

/**
 * 僅允許 Session 認證
 *
 * @param event H3 Event
 * @param requiredPermission 需要的權限（可選）
 * @returns 包含認證資訊的物件
 * @throws 401 未登入
 * @throws 403 權限不足
 */
export const requireSession = async (
  db: ReturnType<typeof useDrizzle>,
  event: H3Event,
  requiredPermission?: Permissions | Permissions[]
) => {
  return requirePermission(db, event, requiredPermission, 'session');
};

/**
 * 僅允許 API Key 認證
 *
 * @param event H3 Event
 * @param requiredPermission 需要的權限（可選）
 * @returns 包含認證資訊的物件
 * @throws 401 缺少 API Key
 * @throws 403 API Key 無效或權限不足
 */
export const requireApiKey = async (
  db: ReturnType<typeof useDrizzle>,
  event: H3Event,
  requiredPermission?: Permissions | Permissions[]
) => {
  return requirePermission(db, event, requiredPermission, 'api');
};

declare module 'h3' {
  interface H3EventContext {
    apiKey?: typeof apiKeyTable.$inferSelect | null;
    memberID?: string;
  }
}
