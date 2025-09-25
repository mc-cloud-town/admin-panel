import { beforeAll, vi } from 'vitest';

import { setupMembersData } from '~~/tests/utils/db-setup.utils';

beforeAll(async () => {
  vi.stubGlobal('dbCtx', await setupMembersData());
});

declare global {
  var dbCtx: Awaited<ReturnType<typeof setupMembersData>>;
}
