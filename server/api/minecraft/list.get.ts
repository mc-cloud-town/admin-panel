import { minecraftServersTable } from '~~/server/database/schema';

export default defineEventHandler(async () => {
  // event
  const db = useDrizzle();
  const data = await db.select().from(minecraftServersTable).execute();
  return data;
});
