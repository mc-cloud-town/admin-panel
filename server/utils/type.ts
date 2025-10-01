import type { CacheConfig } from 'drizzle-orm/cache/core/types';

export enum ResponseCode {
  // General
  SUCCESS = 0,
  NOT_FOUND = 1,
  NOT_AUTHORIZED = 2,

  // Minecraft Whitelist
  MC_SERVER_NOT_FOUND = 1001,
  MC_PLAYER_NOT_FOUND = 1002,
  MC_IP_NOT_WHITELISTED = 1003,
  MC_PLAYER_NOT_WHITELISTED = 1004,
  MC_PLAYER_ROLE_NOT_WHITELISTED = 1005,
}

export interface IAPIResponse<T> {
  code: ResponseCode;
  data?: T;
}

export type IP = string;
export type Port = number;

export type RoleID = string;
export type MemberID = string;

export type MinecraftServerIP = IP;
export type MinecraftServerPort = Port;
export type MinecraftServerAddr = `${MinecraftServerIP}:${MinecraftServerPort}`;
export type MinecraftPlayerID = number;
export type MinecraftUUID = string;
export type MinecraftPlayerName = string;
export type MinecraftServerID = string;

export type ExactlyOne<T extends object> = T extends unknown
  ? {
      [K in keyof T]: Pick<T, K> & Partial<Record<Exclude<keyof T, K>, never>>;
    }[keyof T]
  : never;

export type DBCacheTag = 'users' | 'roles' | 'servers' | 'whitelists';

export type UnionToIntersection<U> =
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (U extends any ? (x: U) => void : never) extends (x: infer I) => void
    ? I
    : never;

declare module 'drizzle-orm/pg-core' {
  interface PgSelectQueryBuilderBase<
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    THKT,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    TTableName,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    TSelection,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    TSelectMode
  > {
    $withCache(
      config?:
        | { tag?: DBCacheTag; config?: CacheConfig; autoInvalidate?: boolean }
        | false
    ): this;
  }
}
