import {
  EventStatusEnum,
  index,
  integer,
  membersTable,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from '.';
import { discordRoleTable } from './accounts';

// 角色列表 - 單一
export const rolesTable = pgTable(
  'roles',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    name: text('name').notNull().unique(),
    description: text('description'),

    discordRoleRefID: integer('discord_role_ref_id').references(
      () => discordRoleTable.id,
      { onDelete: 'set null' }
    ),

    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .$onUpdate(() => new Date())
      .notNull(),

    rank: integer('rank').notNull().default(0),
    permissions: integer('permissions').notNull().default(0),
  },
  (table) => [
    index('roles_discord_role_ref_id_index').on(table.discordRoleRefID),
  ]
);

// 成員角色 - 多對多
export const memberRolesTable = pgTable(
  'member_roles',
  {
    memberRefID: text('member_ref_id')
      .notNull()
      .references(() => membersTable.id, { onDelete: 'cascade' }),
    roleRefID: uuid('role_ref_id')
      .notNull()
      .references(() => rolesTable.id, { onDelete: 'cascade' }),
  },
  (table) => [
    primaryKey({ columns: [table.memberRefID, table.roleRefID] }),
    index('member_roles_role_ref_id_index').on(table.roleRefID),
    index('member_roles_member_ref_id_index').on(table.memberRefID),
  ]
);

// 活動列表 - 單一
export const eventsTable = pgTable(
  'events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(),
    description: text('description'),
    status: EventStatusEnum('status').default('ACTIVE').notNull(),

    startTime: timestamp('start_time'),
    endTime: timestamp('end_time'),

    roleRefID: uuid('role_ref_id').references(() => rolesTable.id, {
      onDelete: 'set null',
    }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [index('events_role_ref_id_index').on(table.roleRefID)]
);

// 活動成員 - 多對多
export const eventMembersTable = pgTable(
  'event_members',
  {
    eventRefID: uuid('event_ref_id')
      .notNull()
      .references(() => eventsTable.id, { onDelete: 'cascade' }),
    memberRefID: text('member_ref_id')
      .notNull()
      .references(() => membersTable.id, { onDelete: 'cascade' }),
  },
  (table) => [
    primaryKey({ columns: [table.eventRefID, table.memberRefID] }),
    index('event_members_event_ref_id_index').on(table.eventRefID),
    index('event_members_member_ref_id_index').on(table.memberRefID),
  ]
);
