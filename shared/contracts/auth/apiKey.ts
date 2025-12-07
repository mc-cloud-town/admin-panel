import {
  boolean,
  date,
  type InferOutput,
  maxLength,
  maxValue,
  minLength,
  minValue,
  nullable,
  number,
  object,
  optional,
  pipe,
  record,
  string,
  transform,
  unknown,
} from 'valibot';

// API Key 創建請求
export const CreateAPIKeyRequestSchema = object({
  name: optional(pipe(string(), minLength(1), maxLength(100))),
  permissions: optional(pipe(number(), minValue(0))),
  expiresAt: optional(
    pipe(
      string(),
      transform((v) => new Date(v))
    )
  ),
  prefix: optional(pipe(string(), maxLength(20))),
  rateLimitEnabled: optional(boolean()),
  rateLimitMax: optional(pipe(number(), minValue(1), maxValue(1000000))),
  rateLimitTimeWindow: optional(pipe(number(), minValue(1000))),
  refillInterval: optional(pipe(number(), minValue(1000))),
  refillAmount: optional(pipe(number(), minValue(1))),
  metadata: optional(record(string(), unknown())),
});
export type CreateAPIKeyRequest = InferOutput<typeof CreateAPIKeyRequestSchema>;

// API Key 創建回應
export const CreateAPIKeyResponseSchema = object({
  id: string(),
  key: string(), // 明文 key，只會在創建時返回一次
  displayKey: string(),
  prefix: string(),
  start: string(),
  createdAt: date(),
});
export type CreateAPIKeyResponse = InferOutput<
  typeof CreateAPIKeyResponseSchema
>;

// API Key 列表項目
export const APIKeyListItemSchema = object({
  id: string(),
  name: nullable(string()),
  displayKey: string(),
  permissions: number(),
  enabled: boolean(),
  rateLimitEnabled: boolean(),
  rateLimitMax: nullable(number()),
  remaining: nullable(number()),
  lastRequest: nullable(date()),
  expiresAt: nullable(date()),
  createdAt: date(),
  updatedAt: date(),
  requestCount: nullable(number()),
});
export type APIKeyListItem = InferOutput<typeof APIKeyListItemSchema>;

// API Key 更新請求
export const UpdateAPIKeyRequestSchema = object({
  name: optional(pipe(string(), minLength(1), maxLength(100))),
  enabled: optional(boolean()),
  permissions: optional(pipe(number(), minValue(0))),
  expiresAt: optional(
    nullable(
      pipe(
        string(),
        transform((v) => new Date(v))
      )
    )
  ),
  rateLimitEnabled: optional(boolean()),
  rateLimitMax: optional(pipe(number(), minValue(1), maxValue(1000000))),
  rateLimitTimeWindow: optional(pipe(number(), minValue(1000))),
  metadata: optional(record(string(), unknown())),
});
export type UpdateAPIKeyRequest = InferOutput<typeof UpdateAPIKeyRequestSchema>;

// API Key 詳細資訊
export const APIKeyDetailSchema = object({
  id: string(),
  name: nullable(string()),
  displayKey: string(),
  prefix: string(),
  start: string(),
  permissions: number(),
  enabled: boolean(),
  rateLimitEnabled: boolean(),
  rateLimitMax: nullable(number()),
  rateLimitTimeWindow: nullable(number()),
  refillInterval: nullable(number()),
  refillAmount: nullable(number()),
  remaining: nullable(number()),
  lastRefillAt: nullable(date()),
  lastRequest: nullable(date()),
  requestCount: nullable(number()),
  expiresAt: nullable(date()),
  createdAt: date(),
  updatedAt: date(),
  metadata: nullable(record(string(), unknown())),
  memberRefID: string(),
});
export type APIKeyDetail = InferOutput<typeof APIKeyDetailSchema>;

// API Key 驗證結果
export const APIKeyValidationResultSchema = object({
  valid: boolean(),
  error: optional(string()),
  rateLimit: optional(
    object({
      allowed: boolean(),
      remaining: number(),
      resetAt: nullable(date()),
    })
  ),
});
export type APIKeyValidationResult = InferOutput<
  typeof APIKeyValidationResultSchema
>;
