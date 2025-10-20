import { z } from 'zod';

/**
 * API Key 創建請求
 */
export const CreateAPIKeyRequestSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  permissions: z.number().int().min(0).optional(),
  expiresAt: z.iso
    .datetime()
    .transform((v) => new Date(v))
    .optional(),
  prefix: z.string().max(20).optional(),
  rateLimitEnabled: z.boolean().optional(),
  rateLimitMax: z.number().int().min(1).max(1000000).optional(),
  rateLimitTimeWindow: z.number().int().min(1000).optional(),
  refillInterval: z.number().int().min(1000).optional(),
  refillAmount: z.number().int().min(1).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});
export type CreateAPIKeyRequest = z.infer<typeof CreateAPIKeyRequestSchema>;

/**
 * API Key 創建回應
 */
export const CreateAPIKeyResponseSchema = z.object({
  id: z.string(),
  key: z.string(), // 明文 key，只會在創建時返回一次
  displayKey: z.string(),
  prefix: z.string(),
  start: z.string(),
  createdAt: z.date(),
});
export type CreateAPIKeyResponse = z.infer<typeof CreateAPIKeyResponseSchema>;

/**
 * API Key 列表項目
 */
export const APIKeyListItemSchema = z.object({
  id: z.string(),
  name: z.string().nullable(),
  displayKey: z.string(),
  permissions: z.number(),
  enabled: z.boolean(),
  rateLimitEnabled: z.boolean(),
  rateLimitMax: z.number().nullable(),
  remaining: z.number().nullable(),
  lastRequest: z.date().nullable(),
  expiresAt: z.date().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
  requestCount: z.number().nullable(),
});
export type APIKeyListItem = z.infer<typeof APIKeyListItemSchema>;

/**
 * API Key 更新請求
 */
export const UpdateAPIKeyRequestSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  enabled: z.boolean().optional(),
  permissions: z.number().int().min(0).optional(),
  expiresAt: z.iso
    .datetime()
    .transform((v) => new Date(v))
    .nullable()
    .optional(),
  rateLimitEnabled: z.boolean().optional(),
  rateLimitMax: z.number().int().min(1).max(1000000).optional(),
  rateLimitTimeWindow: z.number().int().min(1000).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});
export type UpdateAPIKeyRequest = z.infer<typeof UpdateAPIKeyRequestSchema>;

/**
 * API Key 詳細資訊
 */
export const APIKeyDetailSchema = z.object({
  id: z.string(),
  name: z.string().nullable(),
  displayKey: z.string(),
  prefix: z.string(),
  start: z.string(),
  permissions: z.number(),
  enabled: z.boolean(),
  rateLimitEnabled: z.boolean(),
  rateLimitMax: z.number().nullable(),
  rateLimitTimeWindow: z.number().nullable(),
  refillInterval: z.number().nullable(),
  refillAmount: z.number().nullable(),
  remaining: z.number().nullable(),
  lastRefillAt: z.date().nullable(),
  lastRequest: z.date().nullable(),
  requestCount: z.number().nullable(),
  expiresAt: z.date().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
  metadata: z.record(z.string(), z.unknown()).nullable(),
  memberRefID: z.string(),
});
export type APIKeyDetail = z.infer<typeof APIKeyDetailSchema>;

/**
 * API Key 驗證結果
 */
export const APIKeyValidationResultSchema = z.object({
  valid: z.boolean(),
  error: z.string().optional(),
  rateLimit: z
    .object({
      allowed: z.boolean(),
      remaining: z.number(),
      resetAt: z.date().nullable(),
    })
    .optional(),
});
export type APIKeyValidationResult = z.infer<
  typeof APIKeyValidationResultSchema
>;
