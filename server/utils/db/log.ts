import { auditLogsTable } from '~~/server/database/schema';

export const auditLogs = {
  create: async (data: {
    action: string;
    tableName: string;
    recordID: string;
    actorRefID?: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    before?: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    after?: any;
  }) => {
    const db = useDrizzle();
    await db.insert(auditLogsTable).values(data).execute();
  },
};

// // 操作日誌 - 單一
// export const auditLogsTable = pgTable(
//   'audit_logs',
//   {
//     id: serial('id').primaryKey(),
//     action: text('action').notNull(), // e.g. 'CREATE', 'DELETE', 'UPDATE'
//     tableName: text('table_name').notNull(), // e.g. 'members'
//     recordID: text('record_id').notNull(), // e.g. '123', '550e8400-e29b-41d4-a716-446655440000'
//     actorRefID: text('actor_id').references(() => membersTable.id),
//     before: jsonb('before'), // 變更前資料
//     after: jsonb('after'), // 變更後資料
//     createdAt: timestamp('created_at').notNull().defaultNow(),
//   },
//   (table) => [
//     uniqueIndex('audit_logs_table_record_index').on(
//       table.tableName,
//       table.recordID
//     ),
//     index('audit_logs_before_index').using('gin', table.before),
//     index('audit_logs_after_index').using('gin', table.after),
//   ]
// );

// // Minecraft 伺服器狀態變更日誌 - 單一
// export const minecraftServerStatusLogTable = pgTable(
//   'minecraft_server_status_logs',
//   {
//     id: serial('id').primaryKey(),
//     serverRefID: uuid('server_ref_id')
//       .notNull()
//       .references(() => minecraftServersTable.id, { onDelete: 'cascade' }),
//     status: MinecraftServerStatusEnum('status').notNull(),
//     changedAt: timestamp('changed_at').notNull().defaultNow(),
//   }
// );
