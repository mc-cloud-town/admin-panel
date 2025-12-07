import { getMinecraftServers } from '~~/server/utils/db/minecraft-servers';
import { requireAuthPermission } from '~~/server/utils/guards/permission';
import { Permissions } from '~~/server/utils/permission';
import type { MinecraftServerListResponse } from '~~/shared/contracts/minecraft/servers';

/**
 * 取得 Minecraft 伺服器列表
 * GET /api/minecraft/servers
 * 權限：MC_SERVER_STATUS_VIEW 或 MC_SERVER_ADMIN
 */
export default defineEventHandler(async (event) => {
  const db = useDrizzle();
  await requireAuthPermission(db, event, [
    Permissions.MC_SERVER_STATUS_VIEW,
    Permissions.MC_SERVER_ADMIN,
  ]);

  const query = getQuery(event);
  const offset = query.offset ? Number(query.offset) : 0;
  const limit = query.limit ? Number(query.limit) : 100;
  const orderBy = (query.orderBy as 'name' | 'ipAddress') ?? 'name';
  const order = (query.order as 'asc' | 'desc') ?? 'asc';

  const { servers, total } = await getMinecraftServers(db, {
    offset,
    limit,
    orderBy,
    order,
  });

  return {
    servers: servers.map((server) => ({
      id: server.id,
      name: server.name,
      description: server.description,
      ipAddress: server.ipAddress,
      port: server.port,
    })),
    total,
  } satisfies MinecraftServerListResponse;
});
