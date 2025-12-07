import { parse } from 'valibot';

import { createAPIKey } from '~~/server/utils/auth';
import { requireAuthPermission } from '~~/server/utils/guards/permission';
import { Permissions } from '~~/server/utils/permission';
import { CreateAPIKeyRequestSchema } from '~~/shared/contracts/auth/apiKey';

/**
 * 創建新的 API Key
 * POST /api/auth/api-keys
 * 權限：API_TOKEN_CREATE
 */
export default defineEventHandler(async (event) => {
  const db = useDrizzle();
  const { user } = await requireAuthPermission(
    db,
    event,
    Permissions.API_TOKEN_CREATE
  );

  const body = await readValidatedBody(event, (data) =>
    parse(CreateAPIKeyRequestSchema, data)
  );

  const result = await createAPIKey(db, {
    memberRefID: user.id,
    name: body.name,
    permissions: body.permissions,
    expiresAt: body.expiresAt,
    prefix: body.prefix,
    rateLimitEnabled: body.rateLimitEnabled,
    rateLimitMax: body.rateLimitMax,
    rateLimitTimeWindow: body.rateLimitTimeWindow,
    refillInterval: body.refillInterval,
    refillAmount: body.refillAmount,
    metadata: body.metadata,
  });

  return {
    id: result.id,
    key: result.key,
    prefix: result.prefix,
    start: result.start,
    createdAt: result.createdAt,
  };
});
