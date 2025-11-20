import { createHmac, randomBytes } from 'node:crypto';

import { eq, lt } from 'drizzle-orm';
import type { drizzle } from 'drizzle-orm/node-postgres';
import type { H3Event } from 'h3';

import type { ApiKeyFields } from '~~/server/database/schema';
import { apiKeyTable, RATE_LIMIT_MAX_DEFAULT } from '~~/server/database/schema';
import { hasPermission } from '~~/server/utils/auth/permission';

const SERVER_API_KEY_HMAC_SECRET = process.env.SERVER_API_KEY_HMAC_SECRET;
if (!SERVER_API_KEY_HMAC_SECRET) {
  throw new Error('Missing SERVER_API_KEY_HMAC_SECRET environment variable');
}

export const generateRandomKey = (length: number = 32): string => {
  return randomBytes(length).toString('base64url');
};

export const hashAPIKey = (key: string): string => {
  return createHmac('sha256', SERVER_API_KEY_HMAC_SECRET)
    .update(key)
    .digest('hex');
};

const generatePrefix = (prefix: string = 'ctec'): string => {
  return `${prefix}_`;
};

export const getApiKeyValueFromHeader = (event: H3Event): string | null => {
  const authHeader = getHeader(event, 'authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const key = authHeader.slice(7).trim(); // 移除 "Bearer " 和 空白
  if (!key) {
    return null;
  }

  return key;
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
 * 透過 hash 取得 API Key 資訊
 */
export const getApiKeyByHash = async <P extends Partial<ApiKeyFields>>(
  db: ReturnType<typeof drizzle>,
  key: string,
  fields?: P
) => {
  const hashedKey = hashAPIKey(key);

  const apiKeyQuery = fields
    ? db
        .select({ ...fields, id: apiKeyTable.id } as P & {
          id: ApiKeyFields['id'];
        })
        .from(apiKeyTable)
        .where(eq(apiKeyTable.key, hashedKey))
    : db.select().from(apiKeyTable).where(eq(apiKeyTable.key, hashedKey));

  const apiKey = await apiKeyQuery
    .limit(1)
    .execute()
    .then((x) => x.at(0) ?? null);
  if (apiKey === null) return null;

  return apiKey;
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
 * 檢查並更新速率限制
 */
export const checkAndUpdateRateLimit = async (
  db: ReturnType<typeof drizzle>,
  keyID: string
): Promise<{ allowed: boolean; remaining: number; resetAt: Date | null }> => {
  const apiKey = await db
    .select({
      rateLimitEnabled: apiKeyTable.rateLimitEnabled,
      remaining: apiKeyTable.remaining,
      rateLimitTimeWindow: apiKeyTable.rateLimitTimeWindow,
      lastRefillAt: apiKeyTable.lastRefillAt,
    })
    .from(apiKeyTable)
    .where(eq(apiKeyTable.id, keyID))
    .limit(1)
    .then((x) => x.at(0) ?? null);

  if (apiKey === null) {
    return { allowed: false, remaining: 0, resetAt: null };
  }

  if (!apiKey.rateLimitEnabled) {
    return { allowed: true, remaining: -1, resetAt: null };
  }

  const remaining = (apiKey.remaining ?? 0) - 1;
  const now = new Date();
  const resetAt = new Date(
    (apiKey.lastRefillAt?.getTime() ?? now.getTime()) +
      (apiKey.rateLimitTimeWindow ?? 86400000)
  );

  if (remaining < 0) {
    return { allowed: false, remaining: 0, resetAt };
  }

  await db
    .update(apiKeyTable)
    .set({ remaining, lastRequest: now })
    .where(eq(apiKeyTable.id, keyID));

  return { allowed: true, remaining, resetAt };
};

/**
 * 驗證 API Key
 */
export const validateAPIKey = async (
  db: ReturnType<typeof drizzle>,
  key: string,
  permission?: number | number[]
): Promise<{
  valid: boolean;
  apiKey?: Record<string, unknown>;
  error?: string;
  rateLimit?: { remaining: number; resetAt: Date | null };
}> => {
  const apiKey = await getApiKeyByHash(db, key);

  if (apiKey === null) {
    return { valid: false, error: 'Invalid API key' };
  }

  if (!apiKey.enabled) {
    return { valid: false, error: 'API key is disabled' };
  }

  if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
    return { valid: false, error: 'API key has expired' };
  }

  if (permission !== undefined) {
    const hasPerms = hasPermission(apiKey.permissions ?? 0, permission);
    if (!hasPerms) {
      return { valid: false, error: 'Insufficient permissions' };
    }
  }

  // 預設檢查速率限制
  if (apiKey.rateLimitEnabled) {
    const rateLimit = await checkAndUpdateRateLimit(db, apiKey.id);
    if (!rateLimit.allowed) {
      return { valid: false, error: 'Rate limit exceeded' };
    }
    return {
      valid: true,
      apiKey,
      rateLimit: { remaining: rateLimit.remaining, resetAt: rateLimit.resetAt },
    };
  }

  return { valid: true, apiKey };
};
