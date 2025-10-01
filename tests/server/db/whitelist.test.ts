import { beforeAll, describe, expect, it } from 'vitest';

import { checkMinecraftWhitelist } from '~~/server/utils/db/minecraft';
import { ResponseCode } from '~~/server/utils/type';
import { type TestDBCtx, withTestDB } from '~~/tests/utils/db.utils';

let dbCtx: TestDBCtx<{
  roles: true;
  members: true;
  minecraftServers: true;
  minecraftPlayers: true;
  minecraftRelations: true;
  minecraftWhitelists: true;
}>;
beforeAll(async () => {
  const { ctx, close } = await withTestDB({
    roles: true,
    members: true,
    minecraftServers: true,
    minecraftPlayers: true,
    minecraftRelations: true,
    minecraftWhitelists: true,
  });
  dbCtx = ctx;
  return close;
});

describe('Minecraft whitelist', () => {
  it('should allow whitelisted IP', async () => {
    const res = await checkMinecraftWhitelist(dbCtx.db, {
      serverIP: dbCtx.server1.ipAddress,
      serverPort: dbCtx.server1.port,
      ip: '127.0.0.1',
      uuid: dbCtx.player1.uuid,
    });

    expect(res.code).toBe(ResponseCode.SUCCESS);
    expect(res.data?.ok).toBe(true);
  });

  it('should deny non-whitelisted IP', async () => {
    const res = await checkMinecraftWhitelist(dbCtx.db, {
      serverIP: dbCtx.server2.ipAddress,
      serverPort: dbCtx.server2.port,
      ip: '10.0.0.2',
      uuid: dbCtx.player3.uuid,
    });

    expect(res.code).toBe(ResponseCode.MC_IP_NOT_WHITELISTED);
    expect(res.data?.ok).toBe(false);
  });

  it('should allow whitelisted player', async () => {
    const res = await checkMinecraftWhitelist(dbCtx.db, {
      serverIP: dbCtx.server1.ipAddress,
      serverPort: dbCtx.server1.port,
      uuid: dbCtx.player2.uuid,
    });

    expect(res.code).toBe(ResponseCode.SUCCESS);
    expect(res.data?.ok).toBe(true);
  });

  it('should deny non-whitelisted player', async () => {
    const res = await checkMinecraftWhitelist(dbCtx.db, {
      serverIP: dbCtx.server2.ipAddress,
      serverPort: dbCtx.server2.port,
      uuid: dbCtx.player3.uuid,
    });

    expect(res.code).toBe(ResponseCode.MC_PLAYER_NOT_WHITELISTED);
    expect(res.data?.ok).toBe(false);
  });

  it('should allow player with allowed role', async () => {
    const res = await checkMinecraftWhitelist(dbCtx.db, {
      serverIP: dbCtx.server1.ipAddress,
      serverPort: dbCtx.server1.port,
      uuid: dbCtx.player1.uuid,
    });

    expect(res.code).toBe(ResponseCode.SUCCESS);
    expect(res.data?.ok).toBe(true);
  });

  it('should deny player without allowed role', async () => {
    const res = await checkMinecraftWhitelist(dbCtx.db, {
      serverIP: dbCtx.server2.ipAddress,
      serverPort: dbCtx.server2.port,
      uuid: dbCtx.player1.uuid,
    });

    expect(res.code).toBe(ResponseCode.MC_PLAYER_NOT_WHITELISTED);
    expect(res.data?.ok).toBe(false);
  });

  it('should deny unknown player', async () => {
    const res = await checkMinecraftWhitelist(dbCtx.db, {
      serverIP: dbCtx.server1.ipAddress,
      serverPort: dbCtx.server1.port,
      playerName: 'NonExistent',
    });

    expect(res.code).toBe(ResponseCode.MC_PLAYER_NOT_FOUND);
    expect(res.data?.ok).toBe(false);
  });

  it('should deny unknown server', async () => {
    const res = await checkMinecraftWhitelist(dbCtx.db, {
      serverIP: '255.255.255.255',
      serverPort: 25565,
      uuid: dbCtx.player1.uuid,
    });

    expect(res.code).toBe(ResponseCode.MC_SERVER_NOT_FOUND);
    expect(res.data?.ok).toBe(false);
  });
});
