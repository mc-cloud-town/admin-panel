import {
  eventMembersTable,
  eventsTable,
  memberRolesTable,
  membersTable,
  minecraftIPBlocklistTable,
  minecraftPlayerMembersTable,
  minecraftPlayersTable,
  minecraftServerPlayerWhitelistTable,
  minecraftServerRoleWhitelistTable,
  minecraftServersTable,
  rolesTable,
} from '~~/server/database/schema';
import { Permissions } from '~~/server/utils/permission';

import type { TestDB } from './db.utils';

export const seedSetupDB = async (db: TestDB) => {
  // ----------------------------- Members -----------------------------
  const [member1, member2, member3] = await db
    .insert(membersTable)
    .values([
      { id: 'm1', name: 'HaHa1', email: 'test1@mc-ctec.org' },
      { id: 'm2', name: 'HaHa2', email: 'test2@mc-ctec.org' },
      { id: 'm3', name: 'HaHa3', email: 'test3@mc-ctec.org' },
    ])
    .returning();

  const [role1, role2, role3] = await db
    .insert(rolesTable)
    .values([
      { name: 'Role1' },
      { name: 'Role2', permissions: Permissions.ROLE_VIEW },
      { name: 'Role3 - Event', permissions: Permissions.ROLE_ADMIN },
    ])
    .returning();

  await db.insert(memberRolesTable).values([
    { memberRefID: member1.id, roleRefID: role1.id },
    { memberRefID: member1.id, roleRefID: role2.id },
    { memberRefID: member2.id, roleRefID: role2.id },
    { memberRefID: member3.id, roleRefID: role1.id },
  ]);

  const [event1, event2] = await db
    .insert(eventsTable)
    .values([
      { name: 'Event 1', roleRefID: role1.id },
      { name: 'Event 2', roleRefID: role3.id },
    ])
    .returning();

  await db.insert(eventMembersTable).values([
    { eventRefID: event1.id, memberRefID: member3.id },
    { eventRefID: event2.id, memberRefID: member3.id },
  ]);

  // ----------------------------- Minecraft -----------------------------
  const [server1, server2, server3] = await db
    .insert(minecraftServersTable)
    .values([
      { ipAddress: '192.168.1.1', port: 25565, name: 'Server 1' },
      { ipAddress: '192.168.1.2', port: 25565, name: 'Server 2' },
      { ipAddress: '192.168.1.3', port: 25565, name: 'Server 3' },
    ])
    .returning();

  const [player1, player2, player3, player4] = await db
    .insert(minecraftPlayersTable)
    .values([
      { name: 'Steve', uuid: '11111111-1111-1111-1111-111111111111' },
      { name: 'Alex', uuid: '22222222-2222-2222-2222-222222222222' },
      { name: 'Herobrine', uuid: '33333333-3333-3333-3333-333333333333' },
      { name: 'Notch', uuid: '44444444-4444-4444-4444-444444444444' },
    ])
    .returning();

  await db.insert(minecraftPlayerMembersTable).values([
    { memberRefID: member1.id, minecraftPlayerRefID: player1.id },
    { memberRefID: member1.id, minecraftPlayerRefID: player2.id },
    { memberRefID: member2.id, minecraftPlayerRefID: player2.id },
    { memberRefID: member3.id, minecraftPlayerRefID: player3.id },
  ]);

  // ----------------------------- IP 白名單 -----------------------------
  await db.insert(minecraftIPBlocklistTable).values([
    { minecraftServerRefID: server1.id, ipAddress: '127.0.0.1', allow: true },
    { minecraftServerRefID: server1.id, ipAddress: '10.0.0.1', allow: true },
    { minecraftServerRefID: server2.id, ipAddress: '10.0.0.2', allow: false },
  ]);

  // ----------------------------- 玩家白名單 -----------------------------
  await db.insert(minecraftServerPlayerWhitelistTable).values([
    {
      minecraftServerRefID: server1.id,
      minecraftPlayerRefID: player1.id,
      allow: true,
    },
    {
      minecraftServerRefID: server1.id,
      minecraftPlayerRefID: player2.id,
      allow: true,
    },
    {
      minecraftServerRefID: server2.id,
      minecraftPlayerRefID: player3.id,
      allow: false,
    },
  ]);

  // ----------------------------- 角色白名單 -----------------------------
  await db.insert(minecraftServerRoleWhitelistTable).values([
    { roleRefID: role1.id, minecraftServerRefID: server1.id, allow: true },
    { roleRefID: role1.id, minecraftServerRefID: server2.id, allow: false },
    { roleRefID: role3.id, minecraftServerRefID: server3.id, allow: true },
  ]);

  return {
    member1,
    member2,
    member3,
    role1,
    role2,
    role3,
    event1,
    event2,
    server1,
    server2,
    server3,
    player1,
    player2,
    player3,
    player4,
  };
};
