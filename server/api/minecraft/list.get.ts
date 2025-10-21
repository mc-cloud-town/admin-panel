import { minecraftServersTable } from '~~/server/database/schema';
import { requirePermission } from '~~/server/utils/guards/permission';

/**
 * 取得 Minecraft 伺服器列表
 * GET /api/minecraft/list
 * 權限：MC_SERVER_STATUS_VIEW 或 MC_SERVER_ADMIN
 */
export default defineEventHandler(async (event) => {
  const db = useDrizzle();
  await requirePermission(db, event);
  const data = await db.select().from(minecraftServersTable).execute();

  return data;
});
