import { and, eq } from 'drizzle-orm';

import type { CheckWhitelistContracts } from '#shared/contracts/minecraft/whitelist';
import {
  memberRolesTable,
  minecraftIPBlocklistTable,
  minecraftPlayerMembersTable,
  minecraftPlayersTable,
  minecraftServerPlayerWhitelistTable,
  minecraftServerRoleWhitelistTable,
  minecraftServersTable,
} from '~~/server/database/schema';
import { CACHE_MINECRAFT_WHITELIST } from '~~/server/utils/db/cache';

import {
  type IAPIResponse,
  type MinecraftPlayerID,
  type MinecraftPlayerName,
  type MinecraftServerID,
  type MinecraftServerIP,
  type MinecraftServerPort,
  type MinecraftUUID,
  ResponseCode,
} from '../type';

const getServerID = async (
  db: ReturnType<typeof useDrizzle>,
  serverIP: MinecraftServerIP,
  serverPort: MinecraftServerPort
): Promise<MinecraftServerID | null> =>
  db
    .select({ id: minecraftServersTable.id })
    .from(minecraftServersTable)
    .where(
      and(
        eq(minecraftServersTable.ipAddress, serverIP),
        eq(minecraftServersTable.port, serverPort)
      )
    )
    .limit(1)
    .$withCache({
      tag: `${CACHE_MINECRAFT_WHITELIST}:server:${serverIP}:${serverPort}`,
      config: { ex: 60 * 5 },
    })
    .execute()
    .then((r) => r.at(0)?.id ?? null);

const checkIPBlocklist = async (
  db: ReturnType<typeof useDrizzle>,
  serverID: MinecraftServerID,
  ip: MinecraftServerIP
): Promise<boolean> =>
  db
    .select({ allow: minecraftIPBlocklistTable.allow })
    .from(minecraftIPBlocklistTable)
    .where(
      and(
        eq(minecraftIPBlocklistTable.ipAddress, ip),
        eq(minecraftIPBlocklistTable.minecraftServerRefID, serverID)
      )
    )
    .limit(1)
    .$withCache({
      tag: `${CACHE_MINECRAFT_WHITELIST}:id:${serverID}:ip:${ip}`,
      config: { ex: 60 * 5 },
    })
    .execute()
    .then((r) => {
      const rec = r.at(0);
      return !(rec && !rec.allow);
    });

const getPlayerID = async (
  db: ReturnType<typeof useDrizzle>,
  data: { uuid?: MinecraftUUID; playerName?: MinecraftPlayerName }
): Promise<MinecraftPlayerID | null> => {
  const playerIDCacheKey = data.uuid
    ? `player:uuid:${data.uuid}`
    : `player:name:${data.playerName}`;

  return db
    .select({ id: minecraftPlayersTable.id })
    .from(minecraftPlayersTable)
    .where(
      data.uuid
        ? eq(minecraftPlayersTable.uuid, data.uuid)
        : eq(minecraftPlayersTable.name, data.playerName!)
    )
    .limit(1)
    .$withCache({
      tag: `${CACHE_MINECRAFT_WHITELIST}:${playerIDCacheKey}`,
      config: { ex: 60 * 5 },
    })
    .execute()
    .then((r) => r.at(0)?.id ?? null);
};

const checkPlayerWhitelist = async (
  db: ReturnType<typeof useDrizzle>,
  serverID: MinecraftServerID,
  playerID: MinecraftPlayerID
): Promise<boolean> =>
  db
    .select({ allow: minecraftServerPlayerWhitelistTable.allow })
    .from(minecraftServerPlayerWhitelistTable)
    .where(
      and(
        eq(minecraftServerPlayerWhitelistTable.minecraftPlayerRefID, playerID),
        eq(minecraftServerPlayerWhitelistTable.minecraftServerRefID, serverID)
      )
    )
    .limit(1)
    .$withCache({
      tag: `${CACHE_MINECRAFT_WHITELIST}:id:${serverID}:player:${playerID}`,
      config: { ex: 60 * 5 },
    })
    .execute()
    .then((r) => {
      const rec = r.at(0);
      return rec?.allow ?? false;
    });

const checkRoleWhitelist = async (
  db: ReturnType<typeof useDrizzle>,
  serverID: MinecraftServerID,
  playerID: MinecraftPlayerID
): Promise<boolean> =>
  db
    .select({ roleID: memberRolesTable.roleRefID })
    .from(memberRolesTable)
    .innerJoin(
      minecraftPlayerMembersTable,
      eq(memberRolesTable.memberRefID, minecraftPlayerMembersTable.memberRefID)
    )
    .innerJoin(
      minecraftServerRoleWhitelistTable,
      and(
        eq(
          memberRolesTable.roleRefID,
          minecraftServerRoleWhitelistTable.roleRefID
        ),
        eq(minecraftServerRoleWhitelistTable.minecraftServerRefID, serverID),
        eq(minecraftServerRoleWhitelistTable.allow, true)
      )
    )
    .where(eq(minecraftPlayerMembersTable.minecraftPlayerRefID, playerID))
    .limit(1)
    .$withCache({
      tag: `${CACHE_MINECRAFT_WHITELIST}:id:${serverID}:roles`,
      config: { ex: 60 * 5 },
    })
    .execute()
    .then((r) => !!r.at(0));

export const checkMinecraftWhitelist = async (
  db: ReturnType<typeof useDrizzle>,
  data: CheckWhitelistContracts
): Promise<IAPIResponse<IWhitelistResponse>> => {
  const serverID = await getServerID(db, data.serverIP, data.serverPort);
  if (!serverID) {
    return {
      code: ResponseCode.MC_SERVER_NOT_FOUND,
      data: { ok: false, error: 'Server not found' },
    };
  }

  const [ipOk, playerID] = await Promise.all([
    data.ip ? checkIPBlocklist(db, serverID, data.ip) : true,
    getPlayerID(db, data),
  ]);

  if (!ipOk) {
    return {
      code: ResponseCode.MC_IP_NOT_WHITELISTED,
      data: { ok: false, error: 'IP not whitelisted' },
    };
  }
  if (!playerID) {
    return {
      code: ResponseCode.MC_PLAYER_NOT_FOUND,
      data: { ok: false, error: 'Player not found' },
    };
  }

  const [playerOk, roleOk] = await Promise.all([
    checkPlayerWhitelist(db, serverID, playerID),
    checkRoleWhitelist(db, serverID, playerID),
  ]);

  if (!playerOk) {
    return {
      code: ResponseCode.MC_PLAYER_NOT_WHITELISTED,
      data: { ok: false, error: 'Player not whitelisted' },
    };
  }
  if (!roleOk) {
    return {
      code: ResponseCode.MC_PLAYER_NOT_WHITELISTED,
      data: { ok: false, error: 'Player role not whitelisted' },
    };
  }

  return { code: ResponseCode.SUCCESS, data: { ok: true } };
};

export type IWhitelistResponse = { ok: true } | { ok: false; error: string };
