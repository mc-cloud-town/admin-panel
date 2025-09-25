import {
  index,
  jsonb,
  membersTable,
  minecraftServersTable,
  MinecraftServerStatusEnum,
  pgTable,
  serial,
  text,
  timestamp,
  uuid,
} from '.';

// 操作日誌 - 單一
export const auditLogsTable = pgTable(
  'audit_logs',
  {
    id: serial('id').primaryKey(),
    action: text('action').notNull(), // e.g. 'CREATE', 'DELETE', 'UPDATE'
    tableName: text('table_name').notNull(), // e.g. 'members'
    recordID: text('record_id').notNull(), // e.g. '123', '550e8400-e29b-41d4-a716-446655440000'
    actorRefID: text('actor_id').references(() => membersTable.id),
    before: jsonb('before'), // 變更前資料
    after: jsonb('after'), // 變更後資料
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => [
    index('audit_logs_table_name_index').on(table.tableName),
    index('audit_logs_record_id_index').on(table.recordID),
    index('audit_logs_actor_id_index').on(table.actorRefID),
    index('audit_logs_before_index').using('gin', table.before),
    index('audit_logs_after_index').using('gin', table.after),
  ]
);

// Minecraft 伺服器狀態變更日誌 - 單一
export const minecraftServerStatusLogTable = pgTable(
  'minecraft_server_status_logs',
  {
    id: serial('id').primaryKey(),
    serverRefID: uuid('server_ref_id')
      .notNull()
      .references(() => minecraftServersTable.id, { onDelete: 'cascade' }),
    status: MinecraftServerStatusEnum('status').notNull(),
    changedAt: timestamp('changed_at').notNull().defaultNow(),
  },
  (table) => [
    index('minecraft_server_status_logs_server_ref_id_index').on(
      table.serverRefID
    ),
  ]
);
