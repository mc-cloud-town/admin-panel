import { createHash, randomBytes } from 'node:crypto';

import { and, eq, lt } from 'drizzle-orm';
import type { drizzle } from 'drizzle-orm/node-postgres';

import { apiKeyTable, RATE_LIMIT_MAX_DEFAULT } from '~~/server/database/schema';
import { hasPermission } from '~~/server/utils/db/permission';

/**
 * 生成隨機 API Key
 * @param length - Key 長度，預設 32
 * @returns Base64 URL-safe 格式的 key
 */
export const generateRandomKey = (length: number = 32): string => {
  return randomBytes(length).toString('base64url');
};

/**
 * 生成 API Key 的 hash（用於存儲）
 * @param key - 原始 API Key
 * @returns SHA-256 hash
 */
export const hashAPIKey = (key: string): string => {
  return createHash('sha256').update(key).digest('hex');
};

/**
 * 生成 API Key 前綴（用於識別）
 * @param prefix - 自定義前綴，預設 'ctec'
 * @returns 格式化的前綴
 */
const generatePrefix = (prefix: string = 'ctec'): string => {
  return `${prefix}_`;
};

export interface CreateAPIKeyOptions {
  name?: string;
  memberRefID: string;
  permissions?: number;
  expiresAt?: Date;
  prefix?: string;
  refillInterval?: number;
  refillAmount?: number;
  rateLimitEnabled?: boolean;
  rateLimitTimeWindow?: number;
  rateLimitMax?: number;
  metadata?: Record<string, unknown>;
}

export interface CreateAPIKeyResult {
  id: string;
  key: string; // 只在創建時返回一次，之後無法取得
  hashedKey: string;
  prefix: string;
  start: string;
  createdAt: Date;
}

/**
 * 創建新的 API Key
 */
export const createAPIKey = async (
  db: ReturnType<typeof drizzle>,
  {
    name,
    memberRefID,
    expiresAt,
    refillInterval,
    refillAmount,
    rateLimitEnabled,
    rateLimitTimeWindow,
    rateLimitMax,
    metadata,
    permissions,
    ...options
  }: CreateAPIKeyOptions
): Promise<CreateAPIKeyResult> => {
  const rawKey = generateRandomKey(32);
  const hashedKey = hashAPIKey(rawKey);
  const prefix = generatePrefix(options.prefix);
  const start = rawKey.substring(0, 8); // 保存前 8 個字元用於顯示
  const now = new Date();

  const result = await db
    .insert(apiKeyTable)
    .values({
      name: name,
      start,
      prefix,
      key: hashedKey,
      memberRefID,
      permissions,
      expiresAt,
      refillInterval,
      refillAmount,
      rateLimitEnabled,
      rateLimitTimeWindow,
      rateLimitMax,
      remaining: rateLimitMax ?? RATE_LIMIT_MAX_DEFAULT,
      metadata,
      createdAt: now,
      updatedAt: now,
      lastRefillAt: now,
    })
    .returning({ id: apiKeyTable.id })
    .then((res) => res.at(0) ?? null);

  if (result === null) {
    throw new Error('Failed to create API key');
  }

  return {
    id: result.id,
    key: rawKey,
    hashedKey,
    prefix,
    start,
    createdAt: now,
  };
};

/**
 * 刪除指定的 API Key
 */
export const deleteAPIKey = async (
  db: ReturnType<typeof drizzle>,
  keyID: string
): Promise<{ id: string } | null> => {
  const result = await db
    .delete(apiKeyTable)
    .where(eq(apiKeyTable.id, keyID))
    .returning({ id: apiKeyTable.id })
    .then((x) => x.at(0) ?? null);

  return result;
};

/**
 * 刪除所有已過期的 API Keys
 */
export const deleteAPIAllExpiredKeys = async (
  db: ReturnType<typeof drizzle>
): Promise<{ id: string }[]> => {
  const now = new Date();
  const result = await db
    .delete(apiKeyTable)
    .where(lt(apiKeyTable.expiresAt, now))
    .returning({ id: apiKeyTable.id });

  return result;
};

/**
 * 檢查 API Key 是否擁有指定權限
 */
export const hasAPIKeyPermission = async (
  db: ReturnType<typeof drizzle>,
  keyID: string,
  permission: number | number[]
): Promise<boolean> => {
  const apiKey = await db
    .select({ permissions: apiKeyTable.permissions })
    .from(apiKeyTable)
    .where(eq(apiKeyTable.id, keyID))
    .limit(1)
    .then((x) => x.at(0) ?? null);

  if (apiKey === null) return false;

  return hasPermission(apiKey.permissions, permission);
};

/**
 * 透過 hash 取得 API Key 資訊
 */
export const getAPIKeyByHash = async (
  db: ReturnType<typeof drizzle>,
  key: string
) => {
  const hashedKey = hashAPIKey(key);

  const apiKey = await db
    .select()
    .from(apiKeyTable)
    .where(and(eq(apiKeyTable.key, hashedKey), eq(apiKeyTable.enabled, true)))
    .limit(1)
    .then((x) => x.at(0) ?? null);

  if (apiKey === null) return null;

  // 檢查是否過期
  if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
    return null;
  }

  return apiKey;
};

/**
 * 檢查並更新 API Key 的速率限制
 * @returns { allowed: boolean, remaining: number, resetAt: Date | null }
 */
export const checkAndUpdateRateLimit = async (
  db: ReturnType<typeof drizzle>,
  keyID: string
): Promise<{
  allowed: boolean;
  remaining: number;
  resetAt: Date | null;
}> => {
  const apiKey = await db
    .select()
    .from(apiKeyTable)
    .where(eq(apiKeyTable.id, keyID))
    .limit(1)
    .then((x) => x.at(0) ?? null);

  if (apiKey === null) {
    return { allowed: false, remaining: 0, resetAt: null };
  }

  // 如果沒有啟用速率限制
  if (!apiKey.rateLimitEnabled) {
    await db
      .update(apiKeyTable)
      .set({
        lastRequest: new Date(),
        requestCount: (apiKey.requestCount ?? 0) + 1,
      })
      .where(eq(apiKeyTable.id, keyID));

    return { allowed: true, remaining: -1, resetAt: null };
  }

  const now = new Date();
  const refillInterval = apiKey.refillInterval ?? 86400000; // 預設 1 天
  const refillAmount = apiKey.refillAmount ?? 10;
  const lastRefillAt = apiKey.lastRefillAt ?? apiKey.createdAt;
  const timeSinceRefill = now.getTime() - lastRefillAt.getTime();

  let remaining = apiKey.remaining ?? 0;
  let newLastRefillAt = lastRefillAt;

  // 檢查是否需要補充額度
  if (timeSinceRefill >= refillInterval) {
    const refillCount = Math.floor(timeSinceRefill / refillInterval);

    remaining = Math.min(
      apiKey.rateLimitMax ?? 10,
      remaining + refillAmount * refillCount
    );
    newLastRefillAt = new Date(
      lastRefillAt.getTime() + refillCount * refillInterval
    );
  }

  // 檢查是否還有額度
  if (remaining <= 0) {
    const resetAt = new Date(newLastRefillAt.getTime() + refillInterval);

    return { allowed: false, remaining: 0, resetAt };
  }

  remaining--;

  await db
    .update(apiKeyTable)
    .set({
      remaining,
      lastRefillAt: newLastRefillAt,
      lastRequest: now,
      requestCount: (apiKey.requestCount ?? 0) + 1,
    })
    .where(eq(apiKeyTable.id, keyID));

  const resetAt = new Date(newLastRefillAt.getTime() + refillInterval);

  return { allowed: true, remaining, resetAt };
};

/**
 * 更新 API Key
 */
export const updateAPIKey = async (
  db: ReturnType<typeof drizzle>,
  keyID: string,
  updates: Partial<{
    name: string;
    enabled: boolean;
    permissions: number;
    expiresAt: Date | null;
    rateLimitEnabled: boolean;
    rateLimitTimeWindow: number;
    rateLimitMax: number;
    metadata: Record<string, unknown>;
  }>
) => {
  const result = await db
    .update(apiKeyTable)
    .set({ ...updates, updatedAt: new Date() })
    .where(eq(apiKeyTable.id, keyID))
    .returning()
    .then((x) => x.at(0) ?? null);

  return result;
};

/**
 * 列出成員的所有 API Keys
 */
export const listMemberAPIKeys = async (
  db: ReturnType<typeof drizzle>,
  memberRefID: string,
  range: { offset?: number; limit?: number } = {}
) => {
  return db
    .select()
    .from(apiKeyTable)
    .where(eq(apiKeyTable.memberRefID, memberRefID))
    .orderBy(apiKeyTable.createdAt)
    .offset(range.offset ?? 0)
    .limit(range.limit ?? 100);
};

/**
 * 驗證 API Key 並返回完整資訊（含權限檢查和速率限制）
 */
export const validateAPIKey = async (
  db: ReturnType<typeof drizzle>,
  key: string,
  requiredPermission?: number | number[]
): Promise<{
  valid: boolean;
  apiKey: typeof apiKeyTable.$inferSelect | null;
  error?: string;
  rateLimit?: { allowed: boolean; remaining: number; resetAt: Date | null };
}> => {
  const apiKey = await getAPIKeyByHash(db, key);
  if (!apiKey) {
    return { valid: false, apiKey: null, error: 'Invalid API key' };
  }

  if (!apiKey.enabled) {
    return { valid: false, apiKey: null, error: 'API key is disabled' };
  }

  // 檢查權限
  if (requiredPermission !== undefined) {
    const hasPerms = hasPermission(apiKey.permissions, requiredPermission);
    if (!hasPerms) {
      return {
        valid: false,
        apiKey: null,
        error: 'Insufficient permissions',
      };
    }
  }

  // 檢查速率限制
  const rateLimit = await checkAndUpdateRateLimit(db, apiKey.id);
  if (!rateLimit.allowed) {
    return {
      valid: false,
      apiKey,
      error: 'Rate limit exceeded',
      rateLimit,
    };
  }

  return { valid: true, apiKey, rateLimit };
};
