import type { EventHandlerRequest } from 'h3';

import type { CheckWhitelistContracts } from '#shared/contracts/minecraft/whitelist';
import { checkWhitelistContracts } from '#shared/contracts/minecraft/whitelist';
import { requireAuthPermission } from '~~/server/utils/guards/permission';

/**
 * 檢查 Minecraft 白名單
 * POST /api/minecraft/whitelist
 * 權限：WHITELIST_MEMBER_ADMIN 或 WHITELIST_ROLE_ADMIN
 */
export default defineEventHandler<
  IWhitelistRequest,
  Promise<IAPIResponse<IWhitelistResponse>>
>(async (event) => {
  const db = useDrizzle();
  await requireAuthPermission(db, event);
  const data = await readValidatedBody(event, checkWhitelistContracts.parse);

  return checkMinecraftWhitelist(db, data);
});

export interface IWhitelistRequest extends EventHandlerRequest {
  body: CheckWhitelistContracts;
}

export type IWhitelistResponse = { ok: true } | { ok: false; error: string };
