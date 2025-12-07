import { getMinecraftServerById } from '~~/server/utils/db/minecraft-servers';
import { requireAuthPermission } from '~~/server/utils/guards/permission';
import { Permissions } from '~~/server/utils/permission';
import type { MinecraftServerResponse } from '~~/shared/contracts/minecraft/servers';

/**
 * 取得單一 Minecraft 伺服器
 * GET /api/minecraft/servers/[id]
 * 權限：MC_SERVER_STATUS_VIEW 或 MC_SERVER_ADMIN
 */
export default defineEventHandler(async (event) => {
  const db = useDrizzle();
  await requireAuthPermission(db, event, [
    Permissions.MC_SERVER_STATUS_VIEW,
    Permissions.MC_SERVER_ADMIN,
  ]);

  const serverID = getRouterParam(event, 'id');
  if (!serverID) {
    throw createError({
      statusCode: 400,
      message: 'Server ID is required',
    });
  }

  const server = await getMinecraftServerById(db, serverID);
  if (!server) {
    throw createError({
      statusCode: 404,
      message: 'Server not found',
    });
  }

  return {
    id: server.id,
    name: server.name,
    description: server.description,
    ipAddress: server.ipAddress,
    port: server.port,
  } satisfies MinecraftServerResponse;
});
