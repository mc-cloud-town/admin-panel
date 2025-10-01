import { beforeAll, bench, describe } from 'vitest';

import { checkMinecraftWhitelist } from '~~/server/utils/db/minecraft';
import { type TestDBCtx, withTestDB } from '~~/tests/utils/db.utils';
import type { DBSeedOptions } from '~~/tests/utils/db-setup.utils';

const seedWith = {
  minecraftServers: true,
  minecraftPlayers: true,
} satisfies DBSeedOptions;

let dbCtx: TestDBCtx<typeof seedWith>;
beforeAll(async () => {
  const { ctx, close } = await withTestDB(seedWith);
  dbCtx = ctx;
  return close;
});

describe('checkMinecraftWhitelist benchmark', () => {
  bench('allowed IP + allowed player + allowed role', async () => {
    await checkMinecraftWhitelist(dbCtx.db, {
      serverIP: dbCtx.server1.ipAddress,
      serverPort: dbCtx.server1.port,
      ip: '127.0.0.1',
      uuid: dbCtx.player1.uuid,
    });
  });

  bench('non-whitelisted IP', async () => {
    await checkMinecraftWhitelist(dbCtx.db, {
      serverIP: dbCtx.server2.ipAddress,
      serverPort: dbCtx.server2.port,
      ip: '10.0.0.2',
      uuid: dbCtx.player1.uuid,
    });
  });

  bench('non-whitelisted player', async () => {
    await checkMinecraftWhitelist(dbCtx.db, {
      serverIP: dbCtx.server1.ipAddress,
      serverPort: dbCtx.server1.port,
      uuid: dbCtx.player4.uuid, // Not linked to any member
    });
  });

  bench('unknown server', async () => {
    await checkMinecraftWhitelist(dbCtx.db, {
      serverIP: '255.255.255.255',
      serverPort: 25565,
      uuid: dbCtx.player1.uuid,
    });
  });
});
