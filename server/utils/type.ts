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
