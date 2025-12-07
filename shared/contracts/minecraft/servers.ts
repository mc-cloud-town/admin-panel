import {
  type InferOutput,
  integer,
  ip,
  maxLength,
  maxValue,
  minLength,
  minValue,
  nullable,
  number,
  object,
  optional,
  pipe,
  string,
} from 'valibot';

/**
 * 創建 Minecraft 伺服器請求 Schema
 */
export const CreateMinecraftServerRequestSchema = object({
  name: pipe(string(), minLength(1), maxLength(100)),
  description: optional(string()),
  ipAddress: pipe(string(), ip()),
  port: pipe(number(), integer(), minValue(1), maxValue(65535)),
});

export type CreateMinecraftServerRequest = InferOutput<
  typeof CreateMinecraftServerRequestSchema
>;

/**
 * 更新 Minecraft 伺服器請求 Schema
 */
export const UpdateMinecraftServerRequestSchema = object({
  name: optional(pipe(string(), minLength(1), maxLength(100))),
  description: optional(nullable(string())),
  ipAddress: optional(pipe(string(), ip())),
  port: optional(pipe(number(), integer(), minValue(1), maxValue(65535))),
});

export type UpdateMinecraftServerRequest = InferOutput<
  typeof UpdateMinecraftServerRequestSchema
>;

/**
 * Minecraft 伺服器回應型別
 */
export interface MinecraftServerResponse {
  id: string;
  name: string;
  description: string | null;
  ipAddress: string;
  port: number;
}

/**
 * Minecraft 伺服器列表回應型別
 */
export interface MinecraftServerListResponse {
  servers: MinecraftServerResponse[];
  total: number;
}
