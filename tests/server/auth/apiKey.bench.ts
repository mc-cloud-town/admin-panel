import { afterAll, beforeAll, bench, describe } from 'vitest';

import {
  createAPIKey,
  getAPIKeyByHash,
  hashAPIKey,
  validateAPIKey,
} from '~~/server/utils/auth/apiKey';
import { Permissions } from '~~/server/utils/permission';
import type { TestDBCtx } from '~~/tests/utils/db.utils';
import { withTestDB } from '~~/tests/utils/db.utils';

describe('API Key Performance Benchmarks', () => {
  let dbCtx: TestDBCtx;
  let cleanup: () => Promise<void>;
  const testMemberID = 'bench-member-001';
  let testKey: string;

  beforeAll(async () => {
    const result = await withTestDB();
    dbCtx = result.ctx;
    cleanup = result.close;

    const apiKey = await createAPIKey(dbCtx.db, {
      memberRefID: testMemberID,
      name: 'Benchmark Key',
      permissions: Permissions.WHITELIST_VIEW | Permissions.MEMBER_VIEW,
      rateLimitEnabled: true,
      rateLimitMax: 1000000, // 高額度避免測試時用完
    });
    testKey = apiKey.key;
  });

  afterAll(async () => {
    await cleanup();
  });

  bench(
    'hashAPIKey - SHA256 hashing',
    () => {
      hashAPIKey(testKey);
    },
    { iterations: 10000 }
  );

  bench(
    'createAPIKey - create new API key with defaults',
    async () => {
      await createAPIKey(dbCtx.db, {
        memberRefID: testMemberID,
        name: 'Bench Key',
      });
    },
    { iterations: 100 }
  );

  bench(
    'getAPIKeyByHash - retrieve API key by hash',
    async () => {
      await getAPIKeyByHash(dbCtx.db, testKey);
    },
    { iterations: 500 }
  );

  bench(
    'validateAPIKey - validate without permission check',
    async () => {
      await validateAPIKey(dbCtx.db, testKey);
    },
    { iterations: 500 }
  );

  bench(
    'validateAPIKey - validate with permission check',
    async () => {
      await validateAPIKey(dbCtx.db, testKey, Permissions.WHITELIST_VIEW);
    },
    { iterations: 500 }
  );

  bench(
    'validateAPIKey - validate with rate limiting',
    async () => {
      await validateAPIKey(dbCtx.db, testKey);
    },
    { iterations: 500 }
  );
});
