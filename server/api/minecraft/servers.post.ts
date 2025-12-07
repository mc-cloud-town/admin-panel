import { parse } from 'valibot';

import {
  createMinecraftServer,
  getMinecraftServerByAddress,
} from '~~/server/utils/db/minecraft-servers';
import { requireAuthPermission } from '~~/server/utils/guards/permission';
import { Permissions } from '~~/server/utils/permission';
import {
  CreateMinecraftServerRequestSchema,
  type MinecraftServerResponse,
} from '~~/shared/contracts/minecraft/servers';

/**
 * 創建 Minecraft 伺服器
 * POST /api/minecraft/servers
 * 權限：MC_SERVER_ADMIN
 */
export default defineEventHandler(async (event) => {
  const db = useDrizzle();
  await requireAuthPermission(db, event, Permissions.MC_SERVER_ADMIN);

  const body = await readValidatedBody(event, (data) =>
    parse(CreateMinecraftServerRequestSchema, data)
  );

  const existingServer = await getMinecraftServerByAddress(
    db,
    body.ipAddress,
    body.port
  );
  if (existingServer) {
    throw createError({
      statusCode: 409,
      message: 'Server with this IP address and port already exists',
    });
  }

  const server = await createMinecraftServer(db, {
    name: body.name,
    description: body.description,
    ipAddress: body.ipAddress,
    port: body.port,
  });
  if (!server) {
    throw createError({
      statusCode: 500,
      message: 'Failed to create Minecraft server',
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
