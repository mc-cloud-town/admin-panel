import { parse } from 'valibot';

import {
  getMinecraftServerByAddress,
  getMinecraftServerById,
  updateMinecraftServer,
} from '~~/server/utils/db/minecraft-servers';
import { requireAuthPermission } from '~~/server/utils/guards/permission';
import { Permissions } from '~~/server/utils/permission';
import {
  type MinecraftServerResponse,
  UpdateMinecraftServerRequestSchema,
} from '~~/shared/contracts/minecraft/servers';

/**
 * 更新 Minecraft 伺服器
 * PATCH /api/minecraft/servers/[id]
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

  const body = await readValidatedBody(event, (data) =>
    parse(UpdateMinecraftServerRequestSchema, data)
  );

  const existingServer = await getMinecraftServerById(db, serverID);
  if (!existingServer) {
    throw createError({
      statusCode: 404,
      message: 'Server not found',
    });
  }

  // Check if updating to an IP and port that conflicts with another server
  if (body.ipAddress || body.port) {
    const ipToCheck = body.ipAddress ?? existingServer.ipAddress;
    const portToCheck = body.port ?? existingServer.port;

    const conflictServer = await getMinecraftServerByAddress(
      db,
      ipToCheck,
      portToCheck
    );

    if (conflictServer && conflictServer.id !== serverID) {
      throw createError({
        statusCode: 409,
        message: 'Another server with this IP address and port already exists',
      });
    }
  }

  const server = await updateMinecraftServer(db, serverID, {
    name: body.name,
    description: body.description,
    ipAddress: body.ipAddress,
    port: body.port,
  });
  if (!server) {
    throw createError({
      statusCode: 500,
      message: 'Failed to update Minecraft server',
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
