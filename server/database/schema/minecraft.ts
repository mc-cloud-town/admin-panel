import {
  boolean,
  index,
  integer,
  pgTable,
  primaryKey,
  serial,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

import { membersTable, rolesTable } from '.';

// 代理伺服器列表 - 單一
export const minecraftProxyServersTable = pgTable(
  'minecraft_proxy_servers',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    name: text('name').notNull(),
    description: text('description'),
    ipAddress: text('ip_address').notNull(),
    port: integer('port').notNull(),
  },
  (table) => [
    uniqueIndex('proxy_servers_unique').on(table.ipAddress, table.port),
  ]
);

// 伺服器列表 - 單一
export const minecraftServersTable = pgTable(
  'minecraft_servers',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    name: text('name').notNull(),
    description: text('description'),

    ipAddress: text('ip_address').notNull(),
    port: integer('port').notNull(),
  },
  (table) => [
    uniqueIndex('minecraft_servers_unique').on(table.ipAddress, table.port),
  ]
);

// Minecraft 玩家 - 單一
export const minecraftPlayersTable = pgTable('minecraft_players', {
  id: serial('id').primaryKey(),

  name: text('name').notNull(),
  uuid: uuid('uuid').notNull().unique(),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at')
    .$onUpdate(() => new Date())
    .notNull(),
});

// Minecraft 伺服器角色白名單 - 多對多
export const minecraftServerRoleWhitelistTable = pgTable(
  'minecraft_server_role_whitelist',
  {
    allow: boolean('allow').notNull().default(true),

    minecraftServerRefID: uuid('minecraft_server_ref_id')
      .notNull()
      .references(() => minecraftServersTable.id, { onDelete: 'cascade' }),
    roleRefID: uuid('role_ref_id')
      .notNull()
      .references(() => rolesTable.id, { onDelete: 'cascade' }),
  },
  (table) => [
    primaryKey({ columns: [table.minecraftServerRefID, table.roleRefID] }),
    index('minecraft_server_role_whitelist_server_ref_id_index').on(
      table.minecraftServerRefID
    ),
    index('minecraft_server_role_whitelist_role_ref_id_index').on(
      table.roleRefID
    ),
  ]
);

// Minecraft 伺服器玩家白名單 - 多對多
export const minecraftServerPlayerWhitelistTable = pgTable(
  'minecraft_server_player_whitelist',
  {
    allow: boolean('allow').notNull().default(true),

    minecraftServerRefID: uuid('minecraft_server_ref_id')
      .notNull()
      .references(() => minecraftServersTable.id, { onDelete: 'cascade' }),
    minecraftPlayerRefID: integer('minecraft_player_ref_id')
      .notNull()
      .references(() => minecraftPlayersTable.id, { onDelete: 'cascade' }),
  },
  (table) => [
    uniqueIndex('minecraft_server_player_whitelist_unique_index').on(
      table.minecraftServerRefID,
      table.minecraftPlayerRefID
    ),
    index('minecraft_server_player_whitelist_server_ref_id_index').on(
      table.minecraftServerRefID
    ),
    index('minecraft_server_player_whitelist_player_ref_id_index').on(
      table.minecraftPlayerRefID
    ),
  ]
);

// Minecraft 玩家連線紀錄 - 單一
export const minecraftPlayerSessionsTable = pgTable(
  'minecraft_player_sessions',
  {
    id: serial('id').primaryKey(),

    ipAddress: text('ip_address').notNull(),
    minecraftPlayerRefID: integer('minecraft_player_ref_id')
      .notNull()
      .references(() => minecraftPlayersTable.id, { onDelete: 'cascade' }),
    minecraftServerRefID: uuid('minecraft_server_ref_id')
      .notNull()
      .references(() => minecraftServersTable.id, { onDelete: 'cascade' }),
    proxyServerRefID: uuid('proxy_server_ref_id').references(
      () => minecraftProxyServersTable.id,
      { onDelete: 'set null' }
    ),

    startedAt: timestamp('started_at').notNull().defaultNow(),
    endedAt: timestamp('ended_at'),
  },
  (table) => [
    index('minecraft_player_sessions_player_ref_id_index').on(
      table.minecraftPlayerRefID
    ),
  ]
);

// Minecraft IP 黑名單 - 單一
export const minecraftIPBlocklistTable = pgTable(
  'minecraft_ip_blocklist',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    description: text('description'),

    ipAddress: text('ip_address').notNull(),
    minecraftServerRefID: uuid('minecraft_server_ref_id')
      .notNull()
      .references(() => minecraftServersTable.id, { onDelete: 'cascade' }),

    allow: boolean('allow').notNull().default(true),

    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex('minecraft_ip_blocklist_unique_index').on(
      table.ipAddress,
      table.minecraftServerRefID
    ),
    index('minecraft_ip_blocklist_server_ref_id_index').on(
      table.minecraftServerRefID
    ),
    index('minecraft_ip_blocklist_ip_address_index').on(table.ipAddress),
  ]
);

// Minecraft 玩家成員 - 多對多
export const minecraftPlayerMembersTable = pgTable(
  'minecraft_player_members',
  {
    memberRefID: text('member_ref_id')
      .notNull()
      .references(() => membersTable.id, { onDelete: 'cascade' }),
    minecraftPlayerRefID: integer('minecraft_player_ref_id')
      .notNull()
      .references(() => minecraftPlayersTable.id, { onDelete: 'cascade' }),
  },
  (table) => [
    primaryKey({ columns: [table.memberRefID, table.minecraftPlayerRefID] }),
    index('minecraft_player_members_member_ref_id_index').on(table.memberRefID),
    index('minecraft_player_members_player_ref_id_index').on(
      table.minecraftPlayerRefID
    ),
  ]
);
