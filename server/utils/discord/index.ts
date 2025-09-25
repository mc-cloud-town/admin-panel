import { Client, GatewayIntentBits } from 'discord.js';
import { sql } from 'drizzle-orm';

import { discordRoleTable } from '~~/server/database/schema/accounts';

export const CTEC_GUILD_ID = '933290709589577728';

const discordClient = new Client({ intents: [GatewayIntentBits.Guilds] });

const TOKEN = process.env.DISCORD_BOT_TOKEN;
console.log(process.env.NODE_ENV);

if (!TOKEN && process.env.NODE_ENV !== 'development') {
  throw new Error('DISCORD_BOT_TOKEN is not set');
}

discordClient.on('ready', async () => {
  console.log(`Discord Bot logged in as ${discordClient.user?.tag}`);

  let guild = discordClient.guilds.cache.get(CTEC_GUILD_ID);
  if (!guild) {
    guild = await discordClient.guilds.fetch(CTEC_GUILD_ID);
  }

  if (!guild) {
    throw new Error('Cannot find guild with ID ' + CTEC_GUILD_ID);
  }

  console.log(`Connected to guild: ${guild.name}`);
  await guild.roles.fetch();
  console.log(`Fetched roles for guild: ${guild.name}`);
  await useDrizzle()
    .insert(discordRoleTable)
    .values(
      guild.roles.cache.map((role) => ({
        name: role.name,
        primaryColor: role.colors.primaryColor,
        discordRoleID: role.id,
      }))
    )
    .onConflictDoUpdate({
      target: discordRoleTable.discordRoleID,
      set: {
        name: sql.raw(`excluded.${discordRoleTable.name.name}`),
        primaryColor: sql.raw(`excluded.${discordRoleTable.primaryColor.name}`),
      },
    })
    .execute();
});

discordClient.login(process.env.DISCORD_BOT_TOKEN);

export const useDiscord = () => discordClient;
