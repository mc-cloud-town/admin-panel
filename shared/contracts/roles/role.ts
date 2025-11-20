import { z } from 'zod';

/**
 * 創建角色請求 Schema
 */
export const CreateRoleRequestSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  permissions: z.number().int().nonnegative().default(0),
  rank: z.number().int().default(0),
  discordRoleRefID: z.number().int().optional(),
});

export type CreateRoleRequest = z.infer<typeof CreateRoleRequestSchema>;

/**
 * 更新角色請求 Schema
 */
export const UpdateRoleRequestSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().optional().nullable(),
  permissions: z.number().int().nonnegative().optional(),
  rank: z.number().int().optional(),
  discordRoleRefID: z.number().int().optional().nullable(),
});

export type UpdateRoleRequest = z.infer<typeof UpdateRoleRequestSchema>;

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
