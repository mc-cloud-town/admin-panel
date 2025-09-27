import { and, eq } from 'drizzle-orm';
import type { EventHandlerRequest } from 'h3';

import type { CheckWhitelistContracts } from '#shared/contracts/minecraft/whitelist';
import { checkWhitelistContracts } from '#shared/contracts/minecraft/whitelist';
import {
  memberRolesTable,
  minecraftIPWhitelistTable,
  minecraftPlayerMembersTable,
  minecraftPlayersTable,
  minecraftServerPlayerWhitelistTable,
  minecraftServerRoleWhitelistTable,
  minecraftServersTable,
} from '~~/server/database/schema';

export default defineEventHandler<
  IWhitelistRequest,
  Promise<IAPIResponse<IWhitelistResponse>>
>(async (event) => {
  const data = await readValidatedBody(event, checkWhitelistContracts.parse);

  const db = useDrizzle();
  const { ip, serverIP, serverPort } = data;

  // Get serverID
  const serverID = await getOrSetCache(
    `${CACHE_MINECRAFT_WHITELIST}:addr:${serverIP}:${serverPort}`,
    async () => {
      const server = await db
        .select({ id: minecraftServersTable.id })
        .from(minecraftServersTable)
        .where(
          and(
            eq(minecraftServersTable.ipAddress, serverIP),
            eq(minecraftServersTable.port, serverPort)
          )
        )
        .limit(1)
        .execute();

      return server.length ? server[0].id : false;
    },
    { ttl: 60 * 60 * 2 } // 2 hr
  );

  if (serverID === false) {
    return {
      code: ResponseCode.MC_SERVER_NOT_FOUND,
      data: { ok: false, error: 'Server not found' },
    };
  }

  // IP whitelist
  if (ip) {
    const ipAllowed = await getOrSetCache(
      `${CACHE_MINECRAFT_WHITELIST}:id:${serverID}:ip:${ip}`,
      async () => {
        const ipResult = await db
          .select({ allow: minecraftIPWhitelistTable.allow })
          .from(minecraftIPWhitelistTable)
          .where(
            and(
              eq(minecraftIPWhitelistTable.ipAddress, ip),
              eq(minecraftIPWhitelistTable.minecraftServerRefID, serverID)
            )
          )
          .limit(1)
          .execute();

        return ipResult.length ? ipResult[0].allow : true; // 預設 allow
      },
      { ttl: 60 * 5 } // 5 minute
    );

    if (!ipAllowed) {
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

  const playerID = await getOrSetCache(
    `${CACHE_MINECRAFT_WHITELIST}:${playerIDCacheKey}`,
    async () => {
      const r = await db
        .select({ id: minecraftPlayersTable.id })
        .from(minecraftPlayersTable)
        .where(
          'uuid' in data
            ? eq(minecraftPlayersTable.uuid, data.uuid)
            : eq(minecraftPlayersTable.name, data.playerName)
        )
        .limit(1)
        .execute();

      return r.length ? r[0].id : false;
    }
  );

  if (playerID === false) {
    return {
      code: ResponseCode.MC_PLAYER_NOT_FOUND,
      data: { ok: false, error: 'Player not found' },
    };
  }

  // Player whitelist allow
  const playerAllowed = await getOrSetCache(
    `${CACHE_MINECRAFT_WHITELIST}:id:${serverID}:player:${playerID}`,
    async () => {
      const playerWhitelistStatus = await db
        .select({ allow: minecraftServerPlayerWhitelistTable.allow })
        .from(minecraftServerPlayerWhitelistTable)
        .where(
          and(
            eq(
              minecraftServerPlayerWhitelistTable.minecraftPlayerRefID,
              playerID
            ),
            eq(
              minecraftServerPlayerWhitelistTable.minecraftServerRefID,
              serverID
            )
          )
        )
        .limit(1)
        .execute();

      return playerWhitelistStatus.length
        ? playerWhitelistStatus[0].allow
        : true; // default allow
    },
    { ttl: 60 * 5 } // 5 minute
  );

  if (!playerAllowed) {
    return {
      code: ResponseCode.MC_PLAYER_NOT_WHITELISTED,
      data: { ok: false, error: 'Player not allowed' },
    };
  }

  // Role whitelist
  const roleAllowed = await getOrSetCache(
    `${CACHE_MINECRAFT_WHITELIST}:id:${serverID}:player:${playerID}:roles`,
    async () => {
      const roleAllowed = await db
        .select({ roleID: memberRolesTable.roleRefID })
        .from(memberRolesTable)
        .innerJoin(
          minecraftPlayerMembersTable,
          eq(
            memberRolesTable.memberRefID,
            minecraftPlayerMembersTable.memberRefID
          )
        )
        .innerJoin(
          minecraftServerRoleWhitelistTable,
          and(
            eq(
              memberRolesTable.roleRefID,
              minecraftServerRoleWhitelistTable.roleRefID
            ),
            eq(
              minecraftServerRoleWhitelistTable.minecraftServerRefID,
              serverID
            ),
            eq(minecraftServerRoleWhitelistTable.allow, true)
          )
        )
        .where(eq(minecraftPlayerMembersTable.minecraftPlayerRefID, playerID))
        .limit(1)
        .execute();

      return !!roleAllowed.length;
    },
    { ttl: 60 * 5 } // 5 minute
  );

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
