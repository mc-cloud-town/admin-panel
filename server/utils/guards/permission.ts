import { eq } from 'drizzle-orm';
import type { PgUpdateSetSource } from 'drizzle-orm/pg-core';
import type { H3Event } from 'h3';

import type { ApiKeyFields } from '~~/server/database/schema';
import { apiKeyTable } from '~~/server/database/schema';
import { hasMemberWithPermissions } from '~~/server/utils/db/member';
import type { Permissions } from '~~/server/utils/permission';

import { getApiKeyByHash, getApiKeyValueFromHeader } from '../auth';

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
export const requireAuthPermission = async (
  db: ReturnType<typeof useDrizzle>,
  event: H3Event,
  customPermissions?: Permissions | Permissions[],
  mode: 'api' | 'session' | 'both' = 'both'
): Promise<AuthenticatedContext> => {
  // 嘗試使用 API Key 認證
  if (mode === 'api' || mode === 'both') {
    const token = getApiKeyValueFromHeader(event);
    if (token) {
      const validatedApiKey = await checkApiKey(
        db,
        token,
        {
          permission: customPermissions,
          expiredCheck: true,
          requireEnabled: true,
        },
        { memberRefID: apiKeyTable.memberRefID }
      );

      if (validatedApiKey && validatedApiKey.apiKey) {
        // API Key 認證成功，返回模擬的 user 物件
        const apiKeyData = validatedApiKey.apiKey as Record<string, unknown>;
        return {
          user: {
            id: apiKeyData.memberRefID as string,
            isApiKey: true,
            apiKeyId: apiKeyData.id as string,
          },
          db,
        };
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
  const session = await auth.api.getSession({ headers: event.headers });
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
    session.user,
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

export type CheckApiKeyResult = {
  error?: { code: string; message: string };
  apiKey: Record<string, unknown> | null;
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
export const checkApiKey = async (
  db: ReturnType<typeof useDrizzle>,
  key: string,
  options: {
    permission?: number | number[];
    expiredCheck?: boolean;
    requireEnabled?: boolean;
    rateLimitCheck?: boolean;
    rateLimitIncrement?: number;
  } = {},
  fields?: Partial<ApiKeyFields>
): Promise<CheckApiKeyResult> => {
  const {
    permission,
    expiredCheck = true,
    requireEnabled = true,
    rateLimitCheck = true,
    rateLimitIncrement = 1,
  } = options;

  const apiKey = await getApiKeyByHash(db, key, {
    ...fields,

    enabled: apiKeyTable.enabled,
    expiresAt: apiKeyTable.expiresAt,
    permissions: apiKeyTable.permissions,
    rateLimitEnabled: apiKeyTable.rateLimitEnabled,
    refillAmount: apiKeyTable.refillAmount,
    remaining: apiKeyTable.remaining,
    lastRequest: apiKeyTable.lastRequest,
    requestCount: apiKeyTable.requestCount,
    refillInterval: apiKeyTable.refillInterval,
  });

  if (apiKey === null) {
    return {
      error: {
        code: 'API_KEY_INVALID',
        message: 'Invalid API key',
      },
      apiKey: null,
    };
  }

  // 檢查啟用狀態
  if (requireEnabled && !apiKey.enabled) {
    return {
      error: {
        code: 'API_KEY_DISABLED',
        message: 'API key is disabled',
      },
      apiKey,
    };
  }

  // 檢查過期時間
  const expiresAt = apiKey.expiresAt as Date | null | undefined;
  if (expiredCheck && expiresAt && expiresAt.getTime() < new Date().getTime()) {
    return {
      error: {
        code: 'API_KEY_EXPIRED',
        message: 'API key has expired',
      },
      apiKey,
    };
  }

  const now = Date.now();
  const newData = {} as PgUpdateSetSource<typeof apiKeyTable>;

  // 處理速率限制(重算剩餘配額、檢查並遞減)
  if (rateLimitCheck && apiKey.rateLimitEnabled) {
    const lastRequestTime =
      apiKey.lastRequest &&
      typeof apiKey.lastRequest === 'object' &&
      'getTime' in apiKey.lastRequest
        ? (apiKey.lastRequest as Date).getTime()
        : 0;
    const refillInterval = Number(apiKey.refillInterval || 0);
    let currentRemaining = Number(apiKey.remaining ?? 0);
    const refillAmount = Number(apiKey.refillAmount ?? 0);

    // Refill tokens based on elapsed intervals
    if (refillInterval > 0) {
      const elapsed = now - lastRequestTime;
      const intervals = Math.floor(elapsed / refillInterval);
      if (intervals > 0 && refillAmount > 0) {
        const tokensToAdd = intervals * refillAmount;
        // cap to refillAmount as the single-interval bucket size if that was intended,
        // otherwise cap to a sensible max (use refillAmount if set, else no cap)
        const cap =
          refillAmount > 0 ? refillAmount : currentRemaining + tokensToAdd;
        currentRemaining = Math.min(currentRemaining + tokensToAdd, cap);
      }
    }

    // If after refill there are no tokens, rate limit is exceeded
    if (currentRemaining <= 0) {
      return {
        error: {
          code: 'API_KEY_RATE_LIMIT_EXCEEDED',
          message: 'API key rate limit exceeded',
        },
        apiKey,
      };
    }

    // Apply decrement for this request
    if (rateLimitIncrement > 0) {
      currentRemaining = currentRemaining - rateLimitIncrement;
      if (currentRemaining < 0) currentRemaining = 0;
      newData.remaining = currentRemaining;
    }

    // 更新最後請求時間
    newData.lastRequest = new Date(now);
  }

  if (Object.keys(newData).length > 0) {
    await db
      .update(apiKeyTable)
      .set(newData)
      .where(eq(apiKeyTable.id, apiKey.id));
  }

  // 檢查權限
  if (
    permission !== undefined &&
    !hasPermission(apiKey.permissions, permission)
  ) {
    return {
      error: {
        code: 'API_KEY_INSUFFICIENT_PERMISSIONS',
        message: 'Insufficient API key permissions',
      },
      apiKey,
    };
  }

  return { apiKey };
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
) => requireAuthPermission(db, event, requiredPermission);

/**
 * 僅允許 Session 認證
 *
 * @param event H3 Event
 * @param requiredPermission 需要的權限（可選）
 * @returns 包含認證資訊的物件
 * @throws 401 未登入
 * @throws 403 權限不足
 */
export const requireSession = (
  db: ReturnType<typeof useDrizzle>,
  event: H3Event,
  requiredPermission?: Permissions | Permissions[]
) => requireAuthPermission(db, event, requiredPermission, 'session');

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
) => requireAuthPermission(db, event, requiredPermission, 'api');

export interface AuthenticatedUser {
  id: string;
  isApiKey?: boolean;
  apiKeyId?: string;
}

export interface AuthenticatedContext {
  user: AuthenticatedUser;
  db: ReturnType<typeof useDrizzle>;
}
