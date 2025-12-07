import {
  type InferOutput,
  integer,
  maxLength,
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
 * 創建角色請求 Schema
 */
export const CreateRoleRequestSchema = object({
  name: pipe(string(), minLength(1), maxLength(100)),
  description: optional(string()),
  permissions: pipe(number(), integer(), minValue(0)),
  rank: pipe(number(), integer()),
  discordRoleRefID: optional(pipe(number(), integer())),
});

export type CreateRoleRequest = InferOutput<typeof CreateRoleRequestSchema>;

/**
 * 更新角色請求 Schema
 */
export const UpdateRoleRequestSchema = object({
  name: optional(pipe(string(), minLength(1), maxLength(100))),
  description: optional(nullable(string())),
  permissions: optional(pipe(number(), integer(), minValue(0))),
  rank: optional(pipe(number(), integer())),
  discordRoleRefID: optional(nullable(pipe(number(), integer()))),
});

export type UpdateRoleRequest = InferOutput<typeof UpdateRoleRequestSchema>;

/**
 * 角色回應型別
 */
export interface RoleResponse {
  id: string;
  name: string;
  description: string | null;
  permissions: number;
  rank: number;
  discordRoleRefID: number | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 角色列表回應型別
 */
export interface RoleListResponse {
  roles: RoleResponse[];
  total: number;
}
