import { minecraftServersTable } from '~~/server/database/schema';

/**
 * 取得 Minecraft 伺服器列表
 * GET /api/minecraft/list
 */
export default defineEventHandler(async () => {
  // event
  const db = useDrizzle();
  const data = await db.select().from(minecraftServersTable).execute();

  return data;
});
