import { randomUUID } from 'node:crypto';

import { eq } from 'drizzle-orm';
import { beforeAll, describe, expect, it } from 'vitest';

import { apiKeyTable } from '~~/server/database/schema';
import {
  checkAndUpdateRateLimit,
  createAPIKey,
  deleteAPIAllExpiredKeys,
  deleteAPIKey,
  getAPIKeyByHash,
  hasAPIKeyPermission,
  hashAPIKey,
  listMemberAPIKeys,
  updateAPIKey,
  validateAPIKey,
} from '~~/server/utils/auth';
import { Permissions } from '~~/server/utils/permission';
import type { TestDBCtx } from '~~/tests/utils/db.utils';
import { withTestDB } from '~~/tests/utils/db.utils';
import type { DBSeedOptions } from '~~/tests/utils/db-setup.utils';

const seedWith = {
  members: true,
} satisfies DBSeedOptions;

let testMemberID: string;
let dbCtx: TestDBCtx<typeof seedWith>;
beforeAll(async () => {
  const { ctx, close } = await withTestDB(seedWith);
  dbCtx = ctx;
  testMemberID = dbCtx.member1.id;
  return close;
});

describe('API Key Management', () => {
  describe('createAPIKey', () => {
    it('should create a new API key with default values', async () => {
      const result = await createAPIKey(dbCtx.db, {
        memberRefID: testMemberID,
        name: 'Test API Key',
      });

      expect(result.id).toBeDefined();
      expect(result.key).toBeDefined();
      expect(result.start).toMatch(/^[a-zA-Z0-9_-]{8}$/);
      expect(result.hashedKey).toBeDefined();
      expect(result.prefix).toBe('ctec_');
      expect(result.start).toHaveLength(8);

      // 驗證資料庫中的記錄
      const stored = await dbCtx.db
        .select()
        .from(apiKeyTable)
        .where(eq(apiKeyTable.id, result.id));

      expect(stored).toHaveLength(1);
      expect(stored[0].key).toBe(result.hashedKey);
      expect(stored[0].name).toBe('Test API Key');
    });

    it('should create API key with custom permissions', async () => {
      const permissions = Permissions.WHITELIST_VIEW | Permissions.MEMBER_VIEW;

      const result = await createAPIKey(dbCtx.db, {
        memberRefID: testMemberID,
        name: 'Custom Permissions Key',
        permissions,
      });

      const stored = await dbCtx.db
        .select()
        .from(apiKeyTable)
        .where(eq(apiKeyTable.id, result.id));

      expect(stored[0].permissions).toBe(permissions);
    });

    it('should create API key with expiration', async () => {
      const expiresAt = new Date(Date.now() + 86400000); // 1 day

      const result = await createAPIKey(dbCtx.db, {
        memberRefID: testMemberID,
        name: 'Expiring Key',
        expiresAt,
      });

      const stored = await dbCtx.db
        .select()
        .from(apiKeyTable)
        .where(eq(apiKeyTable.id, result.id));

      expect(stored[0].expiresAt?.getTime()).toBe(expiresAt.getTime());
    });

    it('should create API key with custom rate limits', async () => {
      const result = await createAPIKey(dbCtx.db, {
        memberRefID: testMemberID,
        name: 'Rate Limited Key',
        rateLimitEnabled: true,
        rateLimitMax: 100,
        rateLimitTimeWindow: 3600000, // 1 hour
        refillAmount: 50,
      });

      const stored = await dbCtx.db
        .select()
        .from(apiKeyTable)
        .where(eq(apiKeyTable.id, result.id));

      expect(stored[0].rateLimitEnabled).toBe(true);
      expect(stored[0].rateLimitMax).toBe(100);
      expect(stored[0].remaining).toBe(100);
      expect(stored[0].refillAmount).toBe(50);
    });
  });

  describe('getAPIKeyByHash', () => {
    it('should retrieve API key by raw key', async () => {
      const created = await createAPIKey(dbCtx.db, {
        memberRefID: testMemberID,
        name: 'Test Key',
      });

      const retrieved = await getAPIKeyByHash(dbCtx.db, created.key);

      expect(retrieved).not.toBeNull();
      expect(retrieved?.id).toBe(created.id);
      expect(retrieved?.name).toBe('Test Key');
    });

    it('should return null for invalid key', async () => {
      const retrieved = await getAPIKeyByHash(dbCtx.db, 'invalid-key');

      expect(retrieved).toBeNull();
    });

    it('should return null for disabled key', async () => {
      const created = await createAPIKey(dbCtx.db, {
        memberRefID: testMemberID,
        name: 'Disabled Key',
      });

      // 停用 key
      await updateAPIKey(dbCtx.db, created.id, { enabled: false });

      const retrieved = await getAPIKeyByHash(dbCtx.db, created.key);

      expect(retrieved).toBeNull();
    });

    it('should return null for expired key', async () => {
      const expiresAt = new Date(Date.now() - 1000); // 已過期

      const created = await createAPIKey(dbCtx.db, {
        memberRefID: testMemberID,
        name: 'Expired Key',
        expiresAt,
      });

      const retrieved = await getAPIKeyByHash(dbCtx.db, created.key);

      expect(retrieved).toBeNull();
    });
  });

  describe('deleteAPIKey', () => {
    it('should delete an existing API key', async () => {
      const created = await createAPIKey(dbCtx.db, {
        memberRefID: testMemberID,
        name: 'To Delete',
      });

      const deleted = await deleteAPIKey(dbCtx.db, created.id);

      expect(deleted !== null).toBe(true);

      const retrieved = await dbCtx.db
        .select()
        .from(apiKeyTable)
        .where(eq(apiKeyTable.id, created.id));

      expect(retrieved).toHaveLength(0);
    });

    it('should return false for non-existent key', async () => {
      const nonExistentID = randomUUID();
      const deleted = await deleteAPIKey(dbCtx.db, nonExistentID);

      expect(deleted !== null).toBe(false);
    });
  });

  describe('deleteAPIAllExpiredKeys', () => {
    it('should delete all expired keys', async () => {
      // Clean up apikey table for isolation
      await dbCtx.db.delete(apiKeyTable);
      const expiredDate = new Date(Date.now() - 1000);
      const futureDate = new Date(Date.now() + 86400000);

      // 創建 2 個過期的 key
      const memberID = dbCtx.member2.id;
      await createAPIKey(dbCtx.db, {
        memberRefID: memberID,
        name: 'Expired 1',
        expiresAt: expiredDate,
      });
      await createAPIKey(dbCtx.db, {
        memberRefID: memberID,
        name: 'Expired 2',
        expiresAt: expiredDate,
      });

      // 創建 1 個未過期的 key
      await createAPIKey(dbCtx.db, {
        memberRefID: memberID,
        name: 'Valid',
        expiresAt: futureDate,
      });

      const deletedKeys = await deleteAPIAllExpiredKeys(dbCtx.db);

      // There are 2 expired keys created above
      expect(deletedKeys.length).toBe(2);

      const remaining = await dbCtx.db
        .select()
        .from(apiKeyTable)
        .where(eq(apiKeyTable.memberRefID, memberID));

      expect(remaining).toHaveLength(1);
      expect(remaining[0].name).toBe('Valid');
    });
  });

  describe('hasAPIKeyPermission', () => {
    it('should return true if API key has the permission', async () => {
      const created = await createAPIKey(dbCtx.db, {
        memberRefID: testMemberID,
        name: 'Permissioned Key',
        permissions: Permissions.WHITELIST_VIEW | Permissions.MEMBER_VIEW,
      });

      const hasPerms = await hasAPIKeyPermission(
        dbCtx.db,
        created.id,
        Permissions.WHITELIST_VIEW
      );

      expect(hasPerms).toBe(true);
    });

    it('should return true if API key has all required permissions', async () => {
      const created = await createAPIKey(dbCtx.db, {
        memberRefID: testMemberID,
        name: 'Multi Permission Key',
        permissions:
          Permissions.WHITELIST_VIEW |
          Permissions.MEMBER_VIEW |
          Permissions.ROLE_VIEW,
      });

      const hasPerms = await hasAPIKeyPermission(dbCtx.db, created.id, [
        Permissions.WHITELIST_VIEW,
        Permissions.MEMBER_VIEW,
      ]);

      expect(hasPerms).toBe(true);
    });

    it('should return false if API key lacks permission', async () => {
      const created = await createAPIKey(dbCtx.db, {
        memberRefID: testMemberID,
        name: 'Limited Key',
        permissions: Permissions.WHITELIST_VIEW,
      });

      const hasPerms = await hasAPIKeyPermission(
        dbCtx.db,
        created.id,
        Permissions.MEMBER_ADMIN
      );

      expect(hasPerms).toBe(false);
    });

    it('should return false for non-existent key', async () => {
      const nonExistentID = randomUUID();
      const hasPerms = await hasAPIKeyPermission(
        dbCtx.db,
        nonExistentID,
        Permissions.WHITELIST_VIEW
      );

      expect(hasPerms).toBe(false);
    });
  });

  describe('checkAndUpdateRateLimit', () => {
    it('should allow request when rate limit is disabled', async () => {
      const created = await createAPIKey(dbCtx.db, {
        memberRefID: testMemberID,
        name: 'No Rate Limit',
        rateLimitEnabled: false,
      });

      const result = await checkAndUpdateRateLimit(dbCtx.db, created.id);

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(-1);
      expect(result.resetAt).toBeNull();
    });

    it('should allow request and decrease remaining count', async () => {
      const created = await createAPIKey(dbCtx.db, {
        memberRefID: testMemberID,
        name: 'Rate Limited',
        rateLimitEnabled: true,
        rateLimitMax: 10,
      });

      const result = await checkAndUpdateRateLimit(dbCtx.db, created.id);

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(9);
      expect(result.resetAt).toBeDefined();
    });

    it('should deny request when rate limit is exhausted', async () => {
      const created = await createAPIKey(dbCtx.db, {
        memberRefID: testMemberID,
        name: 'Exhausted Rate Limit',
        rateLimitEnabled: true,
        rateLimitMax: 1,
      });

      // 第一次請求
      const first = await checkAndUpdateRateLimit(dbCtx.db, created.id);
      expect(first.allowed).toBe(true);
      expect(first.remaining).toBe(0);

      // 第二次請求應該被拒絕
      const second = await checkAndUpdateRateLimit(dbCtx.db, created.id);
      expect(second.allowed).toBe(false);
      expect(second.remaining).toBe(0);
      expect(second.resetAt).toBeDefined();
    });
  });

  describe('updateAPIKey', () => {
    it('should update API key properties', async () => {
      const created = await createAPIKey(dbCtx.db, {
        memberRefID: testMemberID,
        name: 'Original Name',
      });

      const updated = await updateAPIKey(dbCtx.db, created.id, {
        name: 'Updated Name',
        enabled: false,
        permissions: Permissions.WHITELIST_VIEW,
      });

      expect(updated).not.toBeNull();
      expect(updated?.name).toBe('Updated Name');
      expect(updated?.enabled).toBe(false);
      expect(updated?.permissions).toBe(Permissions.WHITELIST_VIEW);
    });

    it('should return null for non-existent key', async () => {
      const nonExistentID = randomUUID();
      const updated = await updateAPIKey(dbCtx.db, nonExistentID, {
        name: 'New Name',
      });

      expect(updated).toBeNull();
    });
  });

  describe('listMemberAPIKeys', () => {
    it('should list all API keys for a member', async () => {
      // Clean up apikey table for isolation
      await dbCtx.db.delete(apiKeyTable);
      const memberID = dbCtx.member2.id;
      await createAPIKey(dbCtx.db, {
        memberRefID: memberID,
        name: 'Key 1',
      });
      await createAPIKey(dbCtx.db, {
        memberRefID: memberID,
        name: 'Key 2',
      });
      // Use a valid seeded member for the other key
      await createAPIKey(dbCtx.db, {
        memberRefID: dbCtx.member3.id,
        name: 'Other Key',
      });

      const keys = await listMemberAPIKeys(dbCtx.db, memberID);

      expect(keys).toHaveLength(2);
      expect(keys.map((k) => k.name).sort()).toEqual(['Key 1', 'Key 2']);
    });

    it('should return empty array for member with no keys', async () => {
      const keys = await listMemberAPIKeys(dbCtx.db, 'no-keys-member');

      expect(keys).toHaveLength(0);
    });
  });

  describe('validateAPIKey', () => {
    it('should validate a valid API key', async () => {
      const created = await createAPIKey(dbCtx.db, {
        memberRefID: testMemberID,
        name: 'Valid Key',
        permissions: Permissions.WHITELIST_VIEW,
      });

      const result = await validateAPIKey(dbCtx.db, created.key);

      expect(result.valid).toBe(true);
      expect(result.apiKey).not.toBeNull();
      expect(result.error).toBeUndefined();
    });

    it('should reject invalid API key', async () => {
      const result = await validateAPIKey(dbCtx.db, 'invalid-key');

      expect(result.valid).toBe(false);
      expect(result.apiKey).toBeNull();
      expect(result.error).toBe('Invalid API key');
    });

    it('should reject disabled API key', async () => {
      const created = await createAPIKey(dbCtx.db, {
        memberRefID: testMemberID,
        name: 'Disabled',
      });

      await updateAPIKey(dbCtx.db, created.id, { enabled: false });

      const result = await validateAPIKey(dbCtx.db, created.key);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid API key');
    });

    it('should reject API key without required permission', async () => {
      const created = await createAPIKey(dbCtx.db, {
        memberRefID: testMemberID,
        name: 'Limited',
        permissions: Permissions.WHITELIST_VIEW,
      });

      const result = await validateAPIKey(
        dbCtx.db,
        created.key,
        Permissions.MEMBER_ADMIN
      );

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Insufficient permissions');
    });

    it('should accept API key with required permission', async () => {
      const created = await createAPIKey(dbCtx.db, {
        memberRefID: testMemberID,
        name: 'Authorized',
        permissions: Permissions.WHITELIST_VIEW | Permissions.MEMBER_VIEW,
      });

      const result = await validateAPIKey(
        dbCtx.db,
        created.key,
        Permissions.WHITELIST_VIEW
      );

      expect(result.valid).toBe(true);
      expect(result.apiKey).not.toBeNull();
    });

    it('should check rate limit', async () => {
      const created = await createAPIKey(dbCtx.db, {
        memberRefID: testMemberID,
        name: 'Rate Limited',
        rateLimitEnabled: true,
        rateLimitMax: 1,
      });

      // 第一次請求
      const first = await validateAPIKey(dbCtx.db, created.key);
      expect(first.valid).toBe(true);
      expect(first.rateLimit?.remaining).toBe(0);

      // 第二次請求應該被速率限制
      const second = await validateAPIKey(dbCtx.db, created.key);
      expect(second.valid).toBe(false);
      expect(second.error).toBe('Rate limit exceeded');
    });
  });

  describe('hashAPIKey', () => {
    it('should generate consistent hash', () => {
      const key = 'test-key-123';
      const hash1 = hashAPIKey(key);
      const hash2 = hashAPIKey(key);

      expect(hash1).toBe(hash2);
    });

    it('should generate different hashes for different keys', () => {
      const hash1 = hashAPIKey('key1');
      const hash2 = hashAPIKey('key2');

      expect(hash1).not.toBe(hash2);
    });
  });
});
