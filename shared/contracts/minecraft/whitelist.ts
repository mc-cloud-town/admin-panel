import z from 'zod';

import { IPContracts } from '../common/ip';
import { minecraftPlayerNameContracts, minecraftUUIDContracts } from './base';
import { minecraftServerContracts } from './server';

export const checkWhitelistByUUIDContracts = minecraftServerContracts.extend({
  uuid: minecraftUUIDContracts,
});
export type CheckWhitelistByUUIDContracts = z.infer<
  typeof checkWhitelistByUUIDContracts
>;

export const checkWhitelistByPlayerNameContracts =
  minecraftServerContracts.extend({ playerName: minecraftPlayerNameContracts });
export type CheckWhitelistByPlayerNameContracts = z.infer<
  typeof checkWhitelistByPlayerNameContracts
>;

export const checkWhitelistContracts = z.union([
  checkWhitelistByUUIDContracts.extend({ ip: IPContracts.optional() }),
  checkWhitelistByPlayerNameContracts.extend({ ip: IPContracts.optional() }),
]);
export type CheckWhitelistContracts = z.infer<typeof checkWhitelistContracts>;
