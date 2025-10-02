import type { EventHandlerRequest } from 'h3';

import type { CheckWhitelistContracts } from '#shared/contracts/minecraft/whitelist';
import { checkWhitelistContracts } from '#shared/contracts/minecraft/whitelist';

export default defineEventHandler<
  IWhitelistRequest,
  Promise<IAPIResponse<IWhitelistResponse>>
>(async (event) => {
  const data = await readValidatedBody(event, checkWhitelistContracts.parse);
  const db = useDrizzle();

  return checkMinecraftWhitelist(db, data);
});

export interface IWhitelistRequest extends EventHandlerRequest {
  body: CheckWhitelistContracts;
}

export type IWhitelistResponse = { ok: true } | { ok: false; error: string };
