import type { InferSelectModel } from 'drizzle-orm';

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
import type { UnionToIntersection } from '~~/server/utils/type';

import type { TestDB } from './db.utils';

export interface DBSeedOptions {
  members?: boolean;
  roles?: boolean;
  permissions?: boolean;
  events?: boolean;
  minecraftServers?: boolean;
  minecraftPlayers?: boolean;
  minecraftRelations?: boolean;
  minecraftWhitelists?: boolean;
}

interface SeedMembers {
  member1: InferSelectModel<typeof membersTable>;
  member2: InferSelectModel<typeof membersTable>;
  member3: InferSelectModel<typeof membersTable>;
}

interface SeedRoles {
  role1: InferSelectModel<typeof rolesTable>;
  role2: InferSelectModel<typeof rolesTable>;
  role3: InferSelectModel<typeof rolesTable>;
}

interface SeedEvents {
  event1: InferSelectModel<typeof eventsTable>;
  event2: InferSelectModel<typeof eventsTable>;
}

interface SeedPermissions {
  defaultPermissions: number;
}

interface SeedMinecraftServers {
  server1: InferSelectModel<typeof minecraftServersTable>;
  server2: InferSelectModel<typeof minecraftServersTable>;
  server3: InferSelectModel<typeof minecraftServersTable>;
}

interface SeedMinecraftPlayers {
  player1: InferSelectModel<typeof minecraftPlayersTable>;
  player2: InferSelectModel<typeof minecraftPlayersTable>;
  player3: InferSelectModel<typeof minecraftPlayersTable>;
  player4: InferSelectModel<typeof minecraftPlayersTable>;
}

interface SeedMap {
  members: SeedMembers;
  roles: SeedRoles;
  permissions: SeedPermissions;
  events: SeedEvents;
  minecraftServers: SeedMinecraftServers;
  minecraftPlayers: SeedMinecraftPlayers;
}

type SeedResult<Opt extends DBSeedOptions | undefined> = (Opt extends {
  members: true;
}
  ? SeedMap['members']
  : object) &
  (Opt extends { roles: true } ? SeedMap['roles'] : object) &
  (Opt extends { permissions: true } ? SeedMap['permissions'] : object) &
  (Opt extends { events: true } ? SeedMap['events'] : object) &
  (Opt extends { minecraftServers: true }
    ? SeedMap['minecraftServers']
    : object) &
  (Opt extends { minecraftPlayers: true }
    ? SeedMap['minecraftPlayers']
    : object);

export async function seedSetupDB<Opt extends DBSeedOptions | undefined>(
  db: TestDB,
  options?: Opt
): Promise<SeedResult<Opt>> {
  const result: Partial<UnionToIntersection<SeedMap[keyof SeedMap]>> = {};

  // ----------------------------- Members -----------------------------
  if (options?.members) {
    const [member1, member2, member3] = await db
      .insert(membersTable)
      .values([
        { id: 'm1', name: 'HaHa1', email: 'test1@mc-ctec.org' },
        { id: 'm2', name: 'HaHa2', email: 'test2@mc-ctec.org' },
        { id: 'm3', name: 'HaHa3', email: 'test3@mc-ctec.org' },
      ])
      .returning();

    Object.assign(result, { member1, member2, member3 });
  }

  // ----------------------------- Roles -----------------------------
  if (options?.roles) {
    const [role1, role2, role3] = await db
      .insert(rolesTable)
      .values([
        { name: 'Role1' },
        { name: 'Role2', permissions: Permissions.ROLE_VIEW },
        { name: 'Role3 - Event', permissions: Permissions.ROLE_ADMIN },
      ])
      .returning();

    Object.assign(result, { role1, role2, role3 });

    if (options?.members) {
      await db.insert(memberRolesTable).values([
        { memberRefID: result.member1!.id, roleRefID: role1.id },
        { memberRefID: result.member1!.id, roleRefID: role2.id },
        { memberRefID: result.member2!.id, roleRefID: role2.id },
        { memberRefID: result.member3!.id, roleRefID: role1.id },
      ]);
    }
  }

  // ----------------------------- Events -----------------------------
  if (options?.events && result.role1 && result.role3) {
    const [event1, event2] = await db
      .insert(eventsTable)
      .values([
        { name: 'Event 1', roleRefID: result.role1.id },
        { name: 'Event 2', roleRefID: result.role3.id },
      ])
      .returning();

    Object.assign(result, { event1, event2 });

    if (options.members) {
      await db.insert(eventMembersTable).values([
        { eventRefID: event1.id, memberRefID: result.member3!.id },
        { eventRefID: event2.id, memberRefID: result.member3!.id },
      ]);
    }
  }

  // ----------------------------- Minecraft Servers -----------------------------
  if (options?.minecraftServers) {
    const [server1, server2, server3] = await db
      .insert(minecraftServersTable)
      .values([
        { ipAddress: '192.168.1.1', port: 25565, name: 'Server 1' },
        { ipAddress: '192.168.1.2', port: 25565, name: 'Server 2' },
        { ipAddress: '192.168.1.3', port: 25565, name: 'Server 3' },
      ])
      .returning();

    Object.assign(result, { server1, server2, server3 });
  }

  // ----------------------------- Minecraft Players -----------------------------
  if (options?.minecraftPlayers) {
    const [player1, player2, player3, player4] = await db
      .insert(minecraftPlayersTable)
      .values([
        { name: 'Steve', uuid: '11111111-1111-1111-1111-111111111111' },
        { name: 'Alex', uuid: '22222222-2222-2222-2222-222222222222' },
        { name: 'Herobrine', uuid: '33333333-3333-3333-3333-333333333333' },
        { name: 'Notch', uuid: '44444444-4444-4444-4444-444444444444' },
      ])
      .returning();

    Object.assign(result, { player1, player2, player3, player4 });
  }

  // ----------------------------- 關聯 + 白名單 -----------------------------
  if (
    options?.minecraftRelations &&
    options.members &&
    options.minecraftPlayers
  ) {
    await db.insert(minecraftPlayerMembersTable).values([
      {
        memberRefID: result.member1!.id,
        minecraftPlayerRefID: result.player1!.id,
      },
      {
        memberRefID: result.member1!.id,
        minecraftPlayerRefID: result.player2!.id,
      },
      {
        memberRefID: result.member2!.id,
        minecraftPlayerRefID: result.player2!.id,
      },
      {
        memberRefID: result.member3!.id,
        minecraftPlayerRefID: result.player3!.id,
      },
    ]);
  }

  if (
    options?.minecraftWhitelists &&
    options.minecraftServers &&
    options.minecraftPlayers
  ) {
    await db.insert(minecraftIPBlocklistTable).values([
      {
        minecraftServerRefID: result.server1!.id,
        ipAddress: '127.0.0.1',
        allow: true,
      },
      {
        minecraftServerRefID: result.server1!.id,
        ipAddress: '10.0.0.1',
        allow: true,
      },
      {
        minecraftServerRefID: result.server2!.id,
        ipAddress: '10.0.0.2',
        allow: false,
      },
    ]);

    await db.insert(minecraftServerPlayerWhitelistTable).values([
      {
        minecraftServerRefID: result.server1!.id,
        minecraftPlayerRefID: result.player1!.id,
        allow: true,
      },
      {
        minecraftServerRefID: result.server1!.id,
        minecraftPlayerRefID: result.player2!.id,
        allow: true,
      },
      {
        minecraftServerRefID: result.server2!.id,
        minecraftPlayerRefID: result.player3!.id,
        allow: false,
      },
    ]);

    if (options.roles) {
      await db.insert(minecraftServerRoleWhitelistTable).values([
        {
          roleRefID: result.role1!.id,
          minecraftServerRefID: result.server1!.id,
          allow: true,
        },
        {
          roleRefID: result.role1!.id,
          minecraftServerRefID: result.server2!.id,
          allow: false,
        },
        {
          roleRefID: result.role3!.id,
          minecraftServerRefID: result.server3!.id,
          allow: true,
        },
      ]);
    }
  }

  // ----------------------------- Permissions -----------------------------
  if (options?.permissions) {
    Object.assign(result, {
      defaultPermissions: Permissions.ROLE_VIEW | Permissions.ROLE_ADMIN,
    });
  }

  return result as SeedResult<Opt>;
}
