import {
  deleteMinecraftServer,
  getMinecraftServerById,
} from '~~/server/utils/db/minecraft-servers';
import { requireAuthPermission } from '~~/server/utils/guards/permission';
import { Permissions } from '~~/server/utils/permission';

/**
 * 刪除 Minecraft 伺服器
 * DELETE /api/minecraft/servers/[id]
 * 權限：MC_SERVER_ADMIN
 */
export default defineEventHandler(async (event) => {
  const db = useDrizzle();
  await requireAuthPermission(db, event, Permissions.MC_SERVER_ADMIN);

  const serverID = getRouterParam(event, 'id');
  if (!serverID) {
    throw createError({
      statusCode: 400,
      message: 'Server ID is required',
    });
  }

  const existingServer = await getMinecraftServerById(db, serverID);
  if (!existingServer) {
    throw createError({
      statusCode: 404,
      message: 'Server not found',
    });
  }

  const result = await deleteMinecraftServer(db, serverID);
  if (!result) {
    throw createError({
      statusCode: 500,
      message: 'Failed to delete Minecraft server',
    });
  }

  return { success: true, id: result.id };
});
