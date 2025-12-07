import type { EventHandlerRequest } from 'h3';
import { parse } from 'valibot';

import type { CheckWhitelistContracts } from '#shared/contracts/minecraft/whitelist';
import { checkWhitelistContracts } from '#shared/contracts/minecraft/whitelist';
import { requireAuthPermission } from '~~/server/utils/guards/permission';
import { Permissions } from '~~/server/utils/permission';

/**
 * 檢查 Minecraft 白名單
 * POST /api/minecraft/whitelist
 * 權限：WHITELIST_MEMBER_ADMIN 或 WHITELIST_ROLE_ADMIN 或 WHITELIST_VIEW
 */
export default defineEventHandler<
  IWhitelistRequest,
  Promise<IAPIResponse<IWhitelistResponse>>
>(async (event) => {
  const db = useDrizzle();
  await requireAuthPermission(db, event, [
    Permissions.WHITELIST_MEMBER_ADMIN,
    Permissions.WHITELIST_ROLE_ADMIN,
    Permissions.WHITELIST_VIEW,
  ]);
  const data = await readValidatedBody(event, (d) =>
    parse(checkWhitelistContracts, d)
  );

  return checkMinecraftWhitelist(db, data);
});

export interface IWhitelistRequest extends EventHandlerRequest {
  body: CheckWhitelistContracts;
}

export type IWhitelistResponse = { ok: true } | { ok: false; error: string };
