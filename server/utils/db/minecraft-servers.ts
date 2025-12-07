import { and, count, eq } from 'drizzle-orm';
import type { drizzle } from 'drizzle-orm/node-postgres';

import { minecraftServersTable } from '~~/server/database/schema';
import type { MinecraftServerID } from '~~/server/utils/type';

/**
 * 取得所有 Minecraft 伺服器
 */
export const getMinecraftServers = async (
  db: ReturnType<typeof drizzle>,
  options: {
    offset?: number;
    limit?: number;
    orderBy?: 'name' | 'ipAddress';
    order?: 'asc' | 'desc';
  } = {}
) => {
  const { offset = 0, limit = 100, orderBy = 'name', order = 'asc' } = options;

  const orderColumn =
    orderBy === 'name'
      ? minecraftServersTable.name
      : minecraftServersTable.ipAddress;

  const servers = await db
    .select()
    .from(minecraftServersTable)
    .orderBy(order === 'asc' ? orderColumn : orderColumn)
    .limit(limit)
    .offset(offset);

  const [{ total }] = await db
    .select({ total: count() })
    .from(minecraftServersTable);

  return { servers, total };
};

/**
 * 根據 ID 取得 Minecraft 伺服器
 */
export const getMinecraftServerById = async (
  db: ReturnType<typeof drizzle>,
  serverID: MinecraftServerID
) => {
  return db
    .select()
    .from(minecraftServersTable)
    .where(eq(minecraftServersTable.id, serverID))
    .limit(1)
    .then((res) => res.at(0) ?? null);
};

/**
 * 根據 IP 與 Port 取得 Minecraft 伺服器
 */
export const getMinecraftServerByAddress = async (
  db: ReturnType<typeof drizzle>,
  ipAddress: string,
  port: number
) => {
  return db
    .select()
    .from(minecraftServersTable)
    .where(
      and(
        eq(minecraftServersTable.ipAddress, ipAddress),
        eq(minecraftServersTable.port, port)
      )
    )
    .limit(1)
    .then((res) => res.at(0) ?? null);
};

/**
 * 創建新 Minecraft 伺服器
 */
export const createMinecraftServer = async (
  db: ReturnType<typeof drizzle>,
  data: {
    name: string;
    description?: string;
    ipAddress: string;
    port: number;
  }
) => {
  const result = await db
    .insert(minecraftServersTable)
    .values({
      name: data.name,
      description: data.description,
      ipAddress: data.ipAddress,
      port: data.port,
    })
    .returning();

  return result.at(0) ?? null;
};

/**
 * 更新 Minecraft 伺服器
 */
export const updateMinecraftServer = async (
  db: ReturnType<typeof drizzle>,
  serverID: MinecraftServerID,
  data: {
    name?: string;
    description?: string | null;
    ipAddress?: string;
    port?: number;
  }
) => {
  const result = await db
    .update(minecraftServersTable)
    .set(data)
    .where(eq(minecraftServersTable.id, serverID))
    .returning();

  return result.at(0) ?? null;
};

/**
 * 刪除 Minecraft 伺服器
 */
export const deleteMinecraftServer = async (
  db: ReturnType<typeof drizzle>,
  serverID: MinecraftServerID
) => {
  const result = await db
    .delete(minecraftServersTable)
    .where(eq(minecraftServersTable.id, serverID))
    .returning({ id: minecraftServersTable.id });

  return result.at(0) ?? null;
};
