import { integer, pgTable, serial, text } from '.';

// Discord 角色 - 單一
export const discordRoleTable = pgTable('discord_roles', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  primaryColor: integer('primary_color'),
  discordRoleID: text('discord_role_id').notNull().unique(),
});
