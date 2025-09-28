import { and, eq } from 'drizzle-orm';
import type { EventHandlerRequest } from 'h3';

import type { CheckWhitelistContracts } from '#shared/contracts/minecraft/whitelist';
import { checkWhitelistContracts } from '#shared/contracts/minecraft/whitelist';
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

export default defineEventHandler<
  IWhitelistRequest,
  Promise<IAPIResponse<IWhitelistResponse>>
>(async (event) => {
  const data = await readValidatedBody(event, checkWhitelistContracts.parse);

  const db = useDrizzle();
  const { ip, serverIP, serverPort } = data;

  // Get serverID
  const serverID = await db
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
      config: { ex: 60 * 5 }, // 5 minute
    })
    .execute()
    .then((r) => r.at(0)?.id ?? null);

  if (serverID === null) {
    return {
      code: ResponseCode.MC_SERVER_NOT_FOUND,
      data: { ok: false, error: 'Server not found' },
    };
  }

  // IP whitelist
  if (ip) {
    const ipAllowed = await db
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
        config: { ex: 60 * 5 }, // 5 minute
      })
      .execute()
      .then((r) => r.at(0));

    if (ipAllowed && !ipAllowed.allow) {
      return {
        code: ResponseCode.MC_IP_NOT_WHITELISTED,
        data: { ok: false, error: 'IP not allowed' },
      };
    }
  }

  // Find player
  const playerIDCacheKey =
    'uuid' in data
      ? (`player:uuid:${data.uuid}` as const)
      : (`player:name:${data.playerName}` as const);

  const playerID = await db
    .select({ id: minecraftPlayersTable.id })
    .from(minecraftPlayersTable)
    .where(
      'uuid' in data
        ? eq(minecraftPlayersTable.uuid, data.uuid)
        : eq(minecraftPlayersTable.name, data.playerName)
    )
    .limit(1)
    .$withCache({
      tag: `${CACHE_MINECRAFT_WHITELIST}:${playerIDCacheKey}`,
      config: { ex: 60 * 5 }, // 5 minute
    })
    .execute()
    .then((r) => r.at(0)?.id ?? null);

  if (playerID === null) {
    return {
      code: ResponseCode.MC_PLAYER_NOT_FOUND,
      data: { ok: false, error: 'Player not found' },
    };
  }

  // Player whitelist allow
  const playerAllowed = await db
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
      config: { ex: 60 * 5 }, // 5 minute
    })
    .execute()
    .then((r) => r.at(0));

  if (!playerAllowed) {
    return {
      code: ResponseCode.MC_PLAYER_NOT_WHITELISTED,
      data: { ok: false, error: 'Player not allowed' },
    };
  }

  // Role whitelist
  const roleAllowed = await db
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
      tag: `${CACHE_MINECRAFT_WHITELIST}:id:${serverID}:whitelist_roles`,
      config: { ex: 60 * 5 }, // 5 minute
    })
    .execute()
    .then((r) => r.at(0));

  if (!roleAllowed) {
    return {
      code: ResponseCode.MC_PLAYER_NOT_WHITELISTED,
      data: { ok: false, error: 'Player role not allowed' },
    };
  }

  return { code: ResponseCode.SUCCESS, data: { ok: true } };
});

export interface IWhitelistRequest extends EventHandlerRequest {
  body: CheckWhitelistContracts;
}

export type IWhitelistResponse = { ok: true } | { ok: false; error: string };
